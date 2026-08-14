// Process-wide event bus so that watchers on one instance of an object see
// events emitted by another instance of the same logical object (same kind+uid
// or kind+name for cluster-scoped resources). Without this, a freshly-fetched
// Pod from a watch stream and the Pod that just patched its own status are
// different JS objects with unrelated EventEmitters.
const EventEmitter = require('events');

const perKind = new Map();

function busFor(kind) {
  if (!perKind.has(kind)) {
    let e = new EventEmitter();
    e.setMaxListeners(0);
    perKind.set(kind, e);
  }
  return perKind.get(kind);
}

function keyFor(obj) {
  return obj?.metadata?.uid || obj?.metadata?.name;
}

module.exports = { busFor, keyFor };
