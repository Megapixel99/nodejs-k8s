// Minimal scheduler: assigns spec.nodeName to any Pod that doesn't have one.
// Picks the first Ready Node. Uses the event bus for wake-ups and a fallback
// poll in case a create happened before the bus was wired.
const Pod = require('../objects/pod.js');
const Node = require('../objects/node.js');
const { busFor } = require('../objects/bus.js');

function isReady(node) {
  let conditions = node?.status?.conditions || [];
  return conditions.some((c) => c.type === 'Ready' && c.status === 'True');
}

async function schedulePod(pod) {
  if (pod?.spec?.nodeName) return;
  let nodes = await Node.find({});
  let readyNode = nodes.find(isReady) || nodes[0];
  if (!readyNode) return;
  await Pod.Model.findOneAndUpdate(
    { 'metadata.uid': pod.metadata.uid },
    { $set: { 'spec.nodeName': readyNode.metadata.name } },
  );
}

function start() {
  busFor('Pod').on('created', (pod) => {
    schedulePod(pod).catch(() => {});
  });
  let tick = async () => {
    try {
      let unscheduled = await Pod.find({ $or: [{ 'spec.nodeName': { $exists: false } }, { 'spec.nodeName': null }, { 'spec.nodeName': '' }] });
      for (const pod of unscheduled) await schedulePod(pod);
    } catch (e) {}
  };
  setInterval(tick, 5000);
}

module.exports = { start };
