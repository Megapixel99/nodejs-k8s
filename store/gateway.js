// etcd's v3 HTTP API, served over the store.
//
// etcd speaks gRPC, but it also ships a JSON gateway on the same port, and
// that gateway is what the etcd documentation's curl examples talk to. Serving
// it means the store is falsifiable from outside the process -- you can point
// something that expects etcd at it and see whether it behaves -- rather than
// being an internal detail you have to take on faith.
//
// The encoding rules come from protobuf's JSON mapping, and both of them are
// the kind of thing that looks like a formatting preference and isn't:
//
//   * `bytes` fields are base64. Keys and values go over the wire encoded, so
//     a key with a slash or a value holding protobuf survives the trip.
//   * `int64` fields are *strings*. Revisions and lease ids exceed what a
//     JSON number holds exactly, and a client that parses 9007199254740993 as
//     a number gets a different one back.
//
// Field names are accepted in both camelCase and snake_case, because the
// gateway has emitted each of them at different points in etcd's life, and
// rejecting the other spelling would be a compatibility bug of our own making.
const http = require('http');
const { StoreError } = require('./mvcc.js');

// Keys are text; values are bytes and stay bytes. Decoding a value to a string
// on the way in would push it through UTF-8 and mangle anything that isn't
// text -- and the values here are protobuf-encoded API objects.
const b64 = (value) => Buffer.from(value ?? '', 'base64').toString('utf8');
const bytes = (value) => Buffer.from(value ?? '', 'base64');
const toB64 = (value) => Buffer.from(value ?? '').toString('base64');

// Reads a field under either spelling, so `range_end` and `rangeEnd` both work.
function field(body, name, fallback) {
  let snake = name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
  return body[name] ?? body[snake] ?? body[snake.toUpperCase()] ?? fallback;
}

function header(node) {
  return {
    cluster_id: '0',
    member_id: '0',
    revision: `${node.store.revision}`,
    raft_term: `${node.raft.currentTerm}`,
  };
}

function encodeKv(kv) {
  return {
    key: toB64(kv.key),
    create_revision: `${kv.createRevision ?? 0}`,
    mod_revision: `${kv.modRevision ?? 0}`,
    version: `${kv.version ?? 0}`,
    value: toB64(kv.value),
    lease: `${kv.lease ?? 0}`,
  };
}

function rangeArgs(body) {
  return {
    rangeEnd: b64(field(body, 'rangeEnd', '')),
    limit: Number(field(body, 'limit', 0)),
    revision: Number(field(body, 'revision', 0)),
    countOnly: Boolean(field(body, 'countOnly', false)),
    keysOnly: Boolean(field(body, 'keysOnly', false)),
    sortOrder: field(body, 'sortOrder', 'NONE'),
    sortTarget: field(body, 'sortTarget', 'KEY'),
    linearizable: !field(body, 'serializable', false),
  };
}

// A transaction's operations arrive wrapped: {request_put: {...}}. Unwrapping
// them into the store's own shape is the only translation that happens here.
function decodeOp(op) {
  let put = field(op, 'requestPut');
  if (put) {
    return {
      op: 'put',
      key: b64(field(put, 'key')),
      value: bytes(field(put, 'value')),
      lease: Number(field(put, 'lease', 0)),
      prevKv: Boolean(field(put, 'prevKv', false)),
    };
  }
  let del = field(op, 'requestDeleteRange');
  if (del) {
    return {
      op: 'deleteRange',
      key: b64(field(del, 'key')),
      rangeEnd: b64(field(del, 'rangeEnd', '')),
      prevKv: Boolean(field(del, 'prevKv', false)),
    };
  }
  let range = field(op, 'requestRange');
  if (range) {
    return { op: 'range', key: b64(field(range, 'key')), ...rangeArgs(range) };
  }
  throw new StoreError('etcdserver: invalid transaction operation', 3);
}

function decodeCompare(cmp) {
  let target = field(cmp, 'target', 'VERSION');
  return {
    key: b64(field(cmp, 'key')),
    target,
    result: field(cmp, 'result', 'EQUAL'),
    version: Number(field(cmp, 'version', 0)),
    createRevision: Number(field(cmp, 'createRevision', 0)),
    modRevision: Number(field(cmp, 'modRevision', 0)),
    lease: Number(field(cmp, 'lease', 0)),
    value: target === 'VALUE' ? bytes(field(cmp, 'value')) : undefined,
  };
}

function encodeResponse(node, response) {
  if (response.type === 'range' || response.kvs) {
    return {
      response_range: {
        header: header(node),
        kvs: (response.kvs || []).map(encodeKv),
        count: `${response.count ?? 0}`,
        more: Boolean(response.more),
      },
    };
  }
  if (response.type === 'deleteRange') {
    return {
      response_delete_range: {
        header: header(node),
        deleted: `${response.deleted ?? 0}`,
        prev_kvs: (response.prevKvs || []).map(encodeKv),
      },
    };
  }
  return {
    response_put: {
      header: header(node),
      ...(response.prevKv ? { prev_kv: encodeKv(response.prevKv) } : {}),
    },
  };
}

class Gateway {
  constructor(node, { address = 'http://127.0.0.1:2379' } = {}) {
    this.node = node;
    this.address = address;
    this.server = null;
  }

  listen() {
    let { port, hostname } = new URL(this.address);
    this.server = http.createServer((req, res) => this.route(req, res));
    return new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(Number(port), hostname || '127.0.0.1', () => resolve(this));
    });
  }

  close() {
    return new Promise((resolve) => (this.server ? this.server.close(resolve) : resolve()));
  }

  async route(req, res) {
    let chunks = [];
    req.on('data', (c) => chunks.push(c));
    await new Promise((resolve) => req.on('end', resolve));
    let body = {};
    try {
      body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
    } catch (e) {
      return this.fail(res, new StoreError('etcdserver: invalid json', 3), 400);
    }
    let path = req.url.split('?')[0].replace(/\/$/, '');
    try {
      switch (path) {
        case '/v3/kv/range': return this.send(res, await this.range(body));
        case '/v3/kv/put': return this.send(res, await this.put(body));
        case '/v3/kv/deleterange': return this.send(res, await this.deleteRange(body));
        case '/v3/kv/txn': return this.send(res, await this.txn(body));
        case '/v3/kv/compaction': return this.send(res, await this.compact(body));
        case '/v3/lease/grant': return this.send(res, await this.leaseGrant(body));
        case '/v3/lease/revoke': return this.send(res, await this.leaseRevoke(body));
        case '/v3/lease/keepalive': return this.send(res, await this.leaseKeepAlive(body));
        case '/v3/lease/timetolive': return this.send(res, this.leaseTimeToLive(body));
        case '/v3/maintenance/status': return this.send(res, this.status());
        case '/v3/watch': return this.watch(req, res, body);
        default:
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Not Found', code: 5, message: 'Not Found' }));
      }
    } catch (e) {
      return this.fail(res, e);
    }
  }

  send(res, payload) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }

  // etcd puts the failure in the body with a code the client switches on, and
  // uses the HTTP status only as a coarse hint. A store that returned 500 with
  // an empty body would look like a broken server rather than a rejected
  // request.
  fail(res, error, status) {
    let code = error.code ?? 2;
    res.writeHead(status || (code === 11 || code === 13 ? 400 : 500), { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message, code, message: error.message }));
  }

  async range(body) {
    let result = await this.node.range(b64(field(body, 'key')), rangeArgs(body));
    return {
      header: header(this.node),
      kvs: (result.kvs || []).map(encodeKv),
      count: `${result.count ?? 0}`,
      more: Boolean(result.more),
    };
  }

  async put(body) {
    let result = await this.node.put(b64(field(body, 'key')), bytes(field(body, 'value')), {
      lease: Number(field(body, 'lease', 0)),
      prevKv: Boolean(field(body, 'prevKv', false)),
      ignoreValue: Boolean(field(body, 'ignoreValue', false)),
      ignoreLease: Boolean(field(body, 'ignoreLease', false)),
    });
    return {
      header: header(this.node),
      ...(result.prevKv ? { prev_kv: encodeKv(result.prevKv) } : {}),
    };
  }

  async deleteRange(body) {
    let result = await this.node.deleteRange(b64(field(body, 'key')), {
      rangeEnd: b64(field(body, 'rangeEnd', '')),
      prevKv: Boolean(field(body, 'prevKv', false)),
    });
    return {
      header: header(this.node),
      deleted: `${result.deleted}`,
      prev_kvs: (result.prevKvs || []).map(encodeKv),
    };
  }

  async txn(body) {
    let result = await this.node.txn({
      compare: (field(body, 'compare', []) || []).map(decodeCompare),
      success: (field(body, 'success', []) || []).map(decodeOp),
      failure: (field(body, 'failure', []) || []).map(decodeOp),
    });
    return {
      header: header(this.node),
      succeeded: Boolean(result.succeeded),
      responses: (result.responses || []).map((r) => encodeResponse(this.node, r)),
    };
  }

  async compact(body) {
    await this.node.compact(Number(field(body, 'revision', 0)));
    return { header: header(this.node) };
  }

  async leaseGrant(body) {
    let result = await this.node.leaseGrant(Number(field(body, 'TTL', field(body, 'ttl', 0))), Number(field(body, 'ID', 0)));
    return { header: header(this.node), ID: `${result.id}`, TTL: `${result.ttl}` };
  }

  async leaseRevoke(body) {
    await this.node.leaseRevoke(Number(field(body, 'ID', 0)));
    return { header: header(this.node) };
  }

  async leaseKeepAlive(body) {
    let result = await this.node.leaseKeepAlive(Number(field(body, 'ID', 0)));
    return { result: { header: header(this.node), ID: `${result.id}`, TTL: `${result.ttl}` } };
  }

  leaseTimeToLive(body) {
    let result = this.node.leaseTimeToLive(Number(field(body, 'ID', 0)));
    return {
      header: header(this.node),
      ID: `${result.id}`,
      TTL: `${result.ttl}`,
      grantedTTL: `${result.grantedTTL}`,
      keys: (result.keys || []).map((k) => toB64(k)),
    };
  }

  status() {
    let status = this.node.status();
    return {
      header: header(this.node),
      version: '3.5.0-compatible',
      dbSize: `${this.node.store.keys.size}`,
      leader: `${status.leaderId ?? ''}`,
      raftIndex: `${status.commitIndex}`,
      raftTerm: `${status.term}`,
      raftAppliedIndex: `${status.lastApplied}`,
    };
  }

  // The watch stream. gRPC would make this bidirectional; over HTTP the
  // create request comes in the body and events stream back as one JSON object
  // per line, which is the same framing the Kubernetes watch uses.
  watch(req, res, body) {
    let create = field(body, 'createRequest', body) || {};
    let key = b64(field(create, 'key'));
    let options = {
      rangeEnd: b64(field(create, 'rangeEnd', '')),
      startRevision: Number(field(create, 'startRevision', 0)),
      prevKv: Boolean(field(create, 'prevKv', false)),
    };
    let watcher;
    try {
      watcher = this.node.watch(key, options);
    } catch (e) {
      return this.fail(res, e, 400);
    }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' });
    res.flushHeaders?.();
    let write = (events, created = false) => {
      res.write(`${JSON.stringify({
        result: {
          header: header(this.node),
          watch_id: `${watcher.id}`,
          created,
          events: events.map((e) => ({
            type: e.type === 'DELETE' ? 'DELETE' : 'PUT',
            kv: encodeKv(e.kv),
            ...(e.prevKv ? { prev_kv: encodeKv(e.prevKv) } : {}),
          })),
        },
      })}\n`);
    };
    write([], true);
    if (watcher.backlog.length) {
      write(watcher.backlog);
    }
    watcher.on((events) => write(events));
    req.on('close', () => watcher.cancel());
  }
}

module.exports = { Gateway };
