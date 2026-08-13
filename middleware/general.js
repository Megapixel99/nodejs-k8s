const { DateTime } = require('luxon');
const { Readable } = require('stream');
const yaml = require('yaml');
const Event = require('../objects/event.js');
const { busFor, keyFor } = require('../objects/bus.js');
const { toProtoBuf, fromProtoBuf, toWatchEvent, normalizeDecoded } = require('./protoBuf.js');

function convertFromProtoBuff(req) {
  if (Buffer.isBuffer(req.body) && req.headers['content-type']?.includes('protobuf')) {
    let tryDecode = (opId) => {
      try {
        return fromProtoBuf(req.body, opId, req.protobufTypes);
      } catch (e) {
        return null;
      }
    };
    if (req.operationId) {
      let decoded = tryDecode(req.operationId);
      if (decoded) return decoded;
    }
    try {
      let b = req.body.subarray(4, req.body.length);
      let unknownType = req.protobufTypes.lookup('Unknown');
      let { typeMeta, raw } = unknownType.decode(b);
      if (typeMeta?.kind) {
        let decoded = tryDecode(typeMeta.kind);
        if (decoded) return decoded;
      }
      // Last-resort partial decode for resources whose full proto isn't
      // loaded (e.g., policy/v1 PodDisruptionBudget). The wire format of most
      // k8s resources starts with field 1 = ObjectMeta; parse that manually
      // so at least metadata.name / namespace reach the save path.
      let meta = tryDecodeObjectMeta(raw, req.protobufTypes);
      return meta ? { ...typeMeta, metadata: meta } : { ...typeMeta };
    } catch (e) {
      return {};
    }
  } else {
    return req.body;
  }
}

function tryDecodeObjectMeta(raw, protobufTypes) {
  if (!Buffer.isBuffer(raw) || raw.length === 0) return null;
  // Find the ObjectMeta message type (any of its fully-qualified registrations will do).
  let ObjectMeta;
  try { ObjectMeta = protobufTypes.lookup('k8s.io.apimachinery.pkg.apis.meta.v1.ObjectMeta'); } catch (_) {}
  if (!ObjectMeta) try { ObjectMeta = protobufTypes.lookup('ObjectMeta'); } catch (_) {}
  if (!ObjectMeta) return null;
  // Scan the raw bytes for field 1 (metadata), wire type 2 (length-delimited).
  // Tag byte = (field_number << 3) | wire_type = (1 << 3) | 2 = 0x0A.
  let i = 0;
  while (i < raw.length) {
    let tag = raw[i];
    if (tag === 0x0A) {
      i += 1;
      let [len, consumed] = readVarint(raw, i);
      i += consumed;
      let metaBytes = raw.subarray(i, i + len);
      try {
        return normalizeDecoded(ObjectMeta.decode(metaBytes).toJSON?.() ?? ObjectMeta.decode(metaBytes));
      } catch (e) {
        return null;
      }
    }
    // Skip unknown fields (crude; full skipping would require type inspection).
    return null;
  }
  return null;
}

function readVarint(buf, start) {
  let result = 0, shift = 0, consumed = 0;
  for (let i = start; i < buf.length && consumed < 10; i++) {
    let byte = buf[i];
    result |= (byte & 0x7F) << shift;
    shift += 7;
    consumed++;
    if ((byte & 0x80) === 0) break;
  }
  return [result, consumed];
}

// Flatten a merge-patch body into Mongo dot-path $set/$unset so merges don't
// replace entire nested objects (e.g., patching metadata.labels.foo must not
// wipe metadata.labels.bar).
function flattenMergePatch(body) {
  let $set = {};
  let $unset = {};
  function walk(obj, prefix) {
    for (const [k, v] of Object.entries(obj || {})) {
      let path = prefix ? `${prefix}.${k}` : k;
      if (v === null) {
        $unset[path] = '';
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        walk(v, path);
      } else {
        $set[path] = v;
      }
    }
  }
  walk(body, '');
  let update = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;
  return update;
}

// Apply a RFC 6902 JSON Patch (array of ops) against a plain-object copy of
// the mongoose doc, returning a flattened Mongo-style update.
function applyJsonPatch(ops, doc) {
  let work = JSON.parse(JSON.stringify(doc));
  for (const op of ops) {
    let tokens = op.path.split('/').slice(1).map((t) => t.replace(/~1/g, '/').replace(/~0/g, '~'));
    let cursor = work;
    for (let i = 0; i < tokens.length - 1; i++) {
      cursor = cursor[tokens[i]];
      if (cursor === undefined) break;
    }
    let leaf = tokens.at(-1);
    if (cursor === undefined) continue;
    if (op.op === 'add' || op.op === 'replace') cursor[leaf] = op.value;
    else if (op.op === 'remove') {
      if (Array.isArray(cursor)) cursor.splice(Number(leaf), 1);
      else delete cursor[leaf];
    }
  }
  return flattenMergePatch({ metadata: work.metadata, spec: work.spec, status: work.status, data: work.data, stringData: work.stringData, type: work.type, rules: work.rules });
}

// Content negotiation for a response body. Lists used to bypass this and
// always send JSON, so a protobuf-only client got JSON for every `list` call.
function negotiate(req, res, payload, operationId = res.operationId) {
  let data = payload;
  if (data && typeof data.toJSON === 'function') {
    data = data.toJSON();
  }
  // Not every route resolves an operationId — the OpenAPI docs only cover some
  // groups — and without one the response silently downgraded to JSON even for
  // kinds we have a .proto for. The payload's own kind is the same name the
  // envelope's typeMeta carries, so use it as the fallback; an unknown name
  // just throws below and lands on JSON anyway.
  operationId = operationId || data?.kind;
  if (req.headers?.accept?.includes('protobuf') && operationId) {
    try {
      let encoded = toProtoBuf(data, operationId, req.protobufTypes);
      res.set('Content-Type', 'application/vnd.kubernetes.protobuf');
      return res.send(encoded);
    } catch (e) {
      // Fall through to JSON so we don't 500 on clients that accept both.
    }
  }
  if (req.headers?.accept?.includes('yaml')) {
    res.set('Content-Type', 'application/yaml');
    return res.send(yaml.stringify(data));
  }
  res.set('Content-Type', 'application/json');
  return res.json(data);
}

// A 404 body is a Status, not the resource, so it needs its own message type —
// encoding it with the route's operationId would produce a garbage object.
function sendNotFound(Model, req, res, name = req.params?.name) {
  return negotiate(req, res.status(404), Model.notFoundStatus(name), 'Status');
}

// `patch` resolves the raw mongo document, whose toJSON carries `_id`/`__v` and
// skips whatever the model derives on construction. Re-wrap it so a patched
// object looks like the same object fetched any other way.
function asApiObject(Model, doc) {
  if (!doc) {
    return doc;
  }
  let plain = typeof doc.toJSON === 'function' ? doc.toJSON() : { ...doc };
  delete plain._id;
  delete plain.__v;
  try {
    return new Model(plain).toJSON();
  } catch (e) {
    return plain;
  }
}

module.exports = {
  notFound: sendNotFound,
  find(Model) {
    return (req, res, next) => {
      Model.findAllSortedByReq(req.query, req.params)
        .then((items) => {
          res.data = items;
          next();
        })
        .catch(next);
    };
  },
  findOne(Model) {
    return (req, res, next) => {
      Model.findOneByReq(req.query, req.params)
        .then((item) => {
          if (!item) {
            return sendNotFound(Model, req, res);
          }
          res.data = item;
          next();
        })
        .catch(next);
    };
  },
  format(Model) {
    return (req, res, next) => {
      if (req.query?.watch === 'true') {
        let eventStream = new Readable({ read() {} });
        eventStream.pipe(res);
        // `;stream=watch` is what a real apiserver sends, and it's how a client
        // knows the body is a frame stream rather than one object.
        if (req.headers?.accept?.includes('protobuf')) {
          res.set('Content-Type', 'application/vnd.kubernetes.protobuf;stream=watch');
        } else {
          res.set('Content-Type', 'application/json;stream=watch');
        }
        let toJson = (x) => (x && typeof x.toJSON === 'function') ? x.toJSON() : x;
        let pushToEventStream = (elem, eventType) => {
          let asJson = toJson(elem);
          if (req.headers?.accept?.includes('protobuf')) {
            // Same fallback as the non-watch path: without it a group with no
            // operationId produced a protobuf stream that never emitted an
            // event, and the client just hung.
            let operationId = res.operationId || asJson?.kind;
            if (!operationId) return;
            let proto = toProtoBuf(asJson, operationId, req.protobufTypes);
            eventStream.push(toWatchEvent(proto, eventType, req.protobufTypes));
            return;
          }
          if (req.headers?.accept?.split(';').find((e) => e === 'as=Table')) {
            Model.table([asJson]).then((table) => {
              if (eventType !== 'ADDED') table.columnDefinitions = null;
              eventStream.push(`${JSON.stringify({ type: eventType, object: table })}\n`);
            });
            return;
          }
          eventStream.push(`${JSON.stringify({ type: eventType, object: asJson })}\n`);
        };

        let seen = new Set();
        Model.findAllSortedByReq(req.query, req.params)
          .then((items) => {
            items.forEach((elem) => {
              seen.add(keyFor(elem));
              pushToEventStream(elem, 'ADDED');
            });
          })
          .catch(() => {});

        let bus = busFor(Model.kind);
        let onCreated = (obj) => {
          let k = keyFor(obj);
          if (seen.has(k)) return;
          seen.add(k);
          pushToEventStream(obj, 'ADDED');
        };
        let onUpdated = (obj) => {
          let k = keyFor(obj);
          if (!seen.has(k)) seen.add(k);
          pushToEventStream(obj, 'MODIFIED');
        };
        let onDeleted = (obj) => {
          seen.delete(keyFor(obj));
          pushToEventStream(obj, 'DELETED');
        };
        bus.on('created', onCreated);
        bus.on('updated', onUpdated);
        bus.on('deleted', onDeleted);

        let cleanup = () => {
          bus.off('created', onCreated);
          bus.off('updated', onUpdated);
          bus.off('deleted', onDeleted);
          try { eventStream.push(null); } catch (e) {}
        };
        res.on('close', cleanup);
        res.on('finish', cleanup);
        return;
      }
      if (req.headers?.accept?.split(';').find((e) => e === 'as=Table')) {
        return Model.table([res.data].flat())
          .then((table) => res.status(200).send(table))
          .catch(next);
      }
      return next();
    };
  },
  list(Model) {
    return (req, res, next) => {
      return Model.listByReq(req.query, req.params)
      .then((list) => negotiate(req, res.status(200), list))
      .catch(next);
    }
  },
  sendObj(Model) {
    return (req, res, next) => {
      if (res.writableEnded === false) {
        return negotiate(req, res, res.data);
      }
      next();
    };
  },
  save(Model) {
    return (req, res, next) => {
      try {
        req.body = convertFromProtoBuff(req);
      } catch (e) {
        next(e);
      }
      if (!req.body?.metadata) {
        req.body.metadata = {};
      }
      let query = { 'metadata.namespace': req.body.metadata.namespace };
      if (['Node', 'APIService', 'Binding', 'ComponentStatus', 'Lease', 'RuntimeClass', 'Namespace'].includes(Model.kind)) {
        if (!req.body.metadata?.name) {
          req.body.metadata.name = (req.params.name || "default");
        }
        query = { 'metadata.name': req.body.metadata.name };
      } else {
        if (!req.body.metadata?.namespace) {
          req.body.metadata.namespace = (req.params.namespace || "default");
        }
        if (req.params.name) {
          query['metadata.name'] = req.params.name;
        }
      }
      return Model.create(req.body, query)
      .then((item) => {
        res.status(201);
        res.data = item;
        return next();
      })
      .catch(next);
    };
  },
  update(Model) {
    return (req, res, next) => {
      try {
        req.body = convertFromProtoBuff(req);
      } catch (e) {
        next(e);
      }
      let query = { 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace };
      if (!req.params.namespace) {
        query = { 'metadata.name': req.params.name };
      }
      if (Object.keys(req.body).length > 0) {
        Model.findOne(query)
        .then((item) => item ? item.update(req.body, query) : Promise.resolve())
        .then((item) => {
          if (item) {
            res.status(200);
            res.data = (item.toJSON ? item.toJSON() : item);
            return next();
          }
          return sendNotFound(Model, req, res);
        })
        .catch(next);
      } else {
        Model.findOne(query)
        .then((item) => {
          if (item) {
            // req.headers.accept = 'application/json';
            res.status(200);
            res.data = item.toJSON();
            return next();
          }
          return sendNotFound(Model, req, res);
        })
        .catch(next);
      }
    }
  },
  patch(Model) {
    return (req, res, next) => {
      try {
        req.body = convertFromProtoBuff(req);
      } catch (e) {
        next(e);
      }
      let query = { 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace };
      if (!req.params.namespace) {
        query = { 'metadata.name': req.params.name };
      }
      let contentType = req.headers['content-type'] || '';
      let update = req.body;
      if (Array.isArray(req.body) && contentType.includes('json-patch+json')) {
        // Need the current doc to apply RFC 6902 ops; findOne first.
        return Model.findOne(query)
          .then((item) => {
            if (!item) return sendNotFound(Model, req, res);
            let doc = item.toJSON ? item.toJSON() : item;
            let flat = applyJsonPatch(req.body, doc);
            return item.patch(flat, query).then((updated) => {
              if (updated) {
                res.status(200);
                res.data = asApiObject(Model, updated);
                return next();
              }
              return sendNotFound(Model, req, res);
            });
          })
          .catch(next);
      }
      // Everything that reaches here is an object body (json-patch returned
      // above), so flatten it to dot-paths. Handing mongoose a nested object
      // replaces the whole subdocument: an apply-patch carrying only
      // metadata.name + labels wiped namespace, uid and creationTimestamp off
      // the stored object, after which every namespaced lookup 404'd.
      if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
        update = flattenMergePatch(req.body);
      }
      if (Object.keys(update || {}).length > 0) {
        Model.findOne(query)
        .then((item) => item ? item.patch(update, query) : Promise.resolve())
        .then((item) => {
          if (item) {
            res.status(200);
            res.data = asApiObject(Model, item);
            return next();
          }
          return sendNotFound(Model, req, res);
        })
        .catch(next);
      } else {
        Model.findOne(query)
        .then((item) => {
          if (!item) {
            return sendNotFound(Model, req, res);
          }
          res.status(200);
          res.data = item.toJSON();
          return next();
        })
        .catch(next);
      }
    };
  },
  deleteOne(Model) {
    return (req, res, next) => {
      let query = { 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace };
      if (!req.params.namespace) {
        query = { 'metadata.name': req.params.name };
      }
      Model.findOne(query)
      .then((item) => item ? Promise.all([item, item.delete()]) : Promise.resolve())
      .then((pair) => {
        if (pair) {
          let [item] = pair;
          res.status(200);
          res.data = Model.successfulStatus(item?.kind?.toLowerCase(), item?.metadata?.name, item?.metadata?.uid);
          return next();
        }
        return sendNotFound(Model, req, res);
      })
      .catch(next);
    };
  },
  delete(Model, sendRes = true) {
    return (req, res, next) => {
      // Scope the delete to the URL namespace (if any) plus any labelSelector
      // / fieldSelector the client sent, so collection-deletes don't wipe
      // every row in the DB.
      let q = Model.genFindQuery(req.query || {}, req.params || {}).params || {};
      return Model.find(q)
      .then((items) => Promise.all(items.map((item) => item.delete())))
      .then((items) => {
        if (res.writableEnded === false && sendRes) {
          res.status(200);
          res.data = items || {};
          return next();
        }
        return next();
      })
      .catch(next);
    };
  }
};
