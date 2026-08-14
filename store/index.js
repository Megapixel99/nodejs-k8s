// The store the API server runs against: one process-wide node, plus the etcd
// endpoint in front of it.
//
// Configuration is environment-only and every value has a working default, so
// the common case -- one process, one node, a directory on disk -- needs no
// configuration at all. A three node cluster is the same binary with STORE_ID
// and STORE_PEERS set.
const path = require('path');
const { StoreNode } = require('./node.js');
const { Gateway } = require('./gateway.js');

let node = null;
let gateway = null;

function enabled() {
  return `${process.env.STORE ?? 'on'}`.toLowerCase() !== 'off';
}

// STORE_PEERS is "id=address,id=address", listing every member including this
// one -- the same shape etcd's --initial-cluster takes, for the same reason:
// a node has to know the whole membership to know what a majority is.
function parsePeers(id, address) {
  let raw = `${process.env.STORE_PEERS ?? ''}`.trim();
  if (!raw) {
    return [{ id, address }];
  }
  return raw.split(',').map((entry) => {
    let [name, peerAddress] = entry.split('=');
    return { id: name.trim(), address: peerAddress.trim() };
  });
}

async function start() {
  if (!enabled() || node) {
    return node;
  }
  let id = process.env.STORE_ID || 'default';
  let address = process.env.RAFT_ADDRESS || 'http://127.0.0.1:2380';
  node = new StoreNode({
    id,
    address,
    dir: process.env.STORE_DIR || path.join(process.cwd(), '.store', id),
    peers: parsePeers(id, address),
  });
  await node.start();
  await node.waitForLeader().catch(() => {});

  // The etcd endpoint is a convenience, not a dependency: if the port is
  // taken, the API server still has its store. Saying so beats failing to
  // boot over an endpoint nothing in-process uses.
  gateway = new Gateway(node, { address: process.env.ETCD_ADDRESS || 'http://127.0.0.1:2379' });
  await gateway.listen().catch((e) => {
    console.log(`etcd endpoint not listening (${e.code || e.message}); the store itself is unaffected`);
    gateway = null;
  });
  return node;
}

async function stop() {
  await gateway?.close();
  await node?.stop();
  gateway = null;
  node = null;
}

module.exports = {
  start,
  stop,
  enabled,
  get: () => node,
  gateway: () => gateway,
};
