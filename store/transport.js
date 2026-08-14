// Peer-to-peer transport for Raft, over plain HTTP.
//
// HTTP is not what a production Raft would use, but it is what makes this one
// inspectable: you can curl a node and ask who it thinks the leader is. The
// only thing the transport owes Raft is that a lost message looks like a lost
// message -- never like a negative reply -- so every failure resolves to null
// rather than a rejection the caller might read as "vote denied".
const http = require('http');

class HttpTransport {
  constructor({ address, handlers = {}, timeout = 1000 }) {
    this.address = address;
    this.handlers = handlers;
    this.timeout = timeout;
    this.server = null;
  }

  listen() {
    let { port, hostname } = new URL(this.address);
    this.server = http.createServer((req, res) => {
      let chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', async () => {
        let name = req.url.replace(/^\/raft\//, '').split('?')[0];
        let handler = this.handlers[name];
        if (!handler) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end('{"error":"unknown rpc"}');
        }
        let body = {};
        try {
          body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end('{"error":"bad json"}');
        }
        try {
          let reply = await handler(body);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(reply ?? {}));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message, code: e.code }));
        }
      });
    });
    return new Promise((resolve) => {
      this.server.listen(Number(port), hostname || '127.0.0.1', () => resolve(this));
    });
  }

  close() {
    return new Promise((resolve) => (this.server ? this.server.close(resolve) : resolve()));
  }

  send(peer, type, payload) {
    let controller = new AbortController();
    // An unreachable peer must not hold up a heartbeat: the timeout is shorter
    // than the election timeout, so a partitioned node is noticed rather than
    // waited on.
    let timer = setTimeout(() => controller.abort(), this.timeout);
    return fetch(`${peer.address}/raft/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .finally(() => clearTimeout(timer));
  }
}

module.exports = { HttpTransport };
