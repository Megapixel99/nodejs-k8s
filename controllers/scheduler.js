// A scheduler that actually decides.
//
// The previous one assigned every pod to the first Ready node it found, which
// meant nothing a controller author could test against: no resource pressure,
// no selectors, no taints, and no way for a pod to be legitimately
// unschedulable. This runs the same shape as kube-scheduler — filter the nodes
// that can run the pod, score the survivors, bind the best one — and reports
// the outcome the way Kubernetes does, because the observable behaviour is the
// product here: `spec.nodeName`, the PodScheduled condition, and a Scheduled
// or FailedScheduling event carrying a message that says which predicate
// rejected how many nodes.
const { DateTime } = require('luxon');
const Pod = require('../objects/pod.js');
const Node = require('../objects/node.js');
const Event = require('../objects/event.js');
const { busFor } = require('../objects/bus.js');
const { parseQuantity } = require('../functions.js');

const SCHEDULER_NAME = 'default-scheduler';
// Effects that keep a pod off a node at scheduling time. PreferNoSchedule is
// deliberately not here: it is a scoring signal, not a filter.
const BLOCKING_TAINT_EFFECTS = new Set(['NoSchedule', 'NoExecute']);

function now() {
  return DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, '');
}

function plain(value) {
  if (!value) {
    return {};
  }
  if (value instanceof Map) {
    return Object.fromEntries(value);
  }
  return typeof value.toObject === 'function' ? value.toObject() : value;
}

function isReady(node) {
  return (node?.status?.conditions || []).some((c) => c.type === 'Ready' && c.status === 'True');
}

// What a pod asks for, summed over its containers. Init containers run one at a
// time before the others, so their requirement is the max of any single one,
// not the sum — the same rule kube-scheduler uses.
function podRequests(pod) {
  let sum = { cpu: 0, memory: 0 };
  for (const container of pod?.spec?.containers || []) {
    let requests = plain(container.resources?.requests);
    sum.cpu += parseQuantity(requests.cpu) || 0;
    sum.memory += parseQuantity(requests.memory) || 0;
  }
  let initMax = { cpu: 0, memory: 0 };
  for (const container of pod?.spec?.initContainers || []) {
    let requests = plain(container.resources?.requests);
    initMax.cpu = Math.max(initMax.cpu, parseQuantity(requests.cpu) || 0);
    initMax.memory = Math.max(initMax.memory, parseQuantity(requests.memory) || 0);
  }
  return {
    cpu: Math.max(sum.cpu, initMax.cpu),
    memory: Math.max(sum.memory, initMax.memory),
  };
}

function nodeAllocatable(node) {
  let allocatable = plain(node?.status?.allocatable);
  let capacity = plain(node?.status?.capacity);
  let read = (key, fallback) => {
    let value = parseQuantity(allocatable[key] ?? capacity[key]);
    return Number.isFinite(value) ? value : fallback;
  };
  return {
    cpu: read('cpu', Infinity),
    memory: read('memory', Infinity),
    pods: read('pods', Infinity),
  };
}

// A pod counts against a node once it is assigned there and hasn't finished.
function usageByNode(pods) {
  let usage = new Map();
  for (const pod of pods) {
    let nodeName = pod?.spec?.nodeName;
    if (!nodeName) {
      continue;
    }
    let phase = pod?.status?.phase;
    if (phase === 'Succeeded' || phase === 'Failed') {
      continue;
    }
    let requests = podRequests(pod);
    let current = usage.get(nodeName) || { cpu: 0, memory: 0, pods: 0 };
    usage.set(nodeName, {
      cpu: current.cpu + requests.cpu,
      memory: current.memory + requests.memory,
      pods: current.pods + 1,
    });
  }
  return usage;
}

function matchesSelector(labels, selector) {
  return Object.entries(selector || {}).every(([key, value]) => `${labels[key]}` === `${value}`);
}

// requiredDuringSchedulingIgnoredDuringExecution only. Preferred terms are a
// scoring input and are handled in scoreNode.
function matchesNodeAffinity(labels, pod) {
  let required = pod?.spec?.affinity?.nodeAffinity?.requiredDuringSchedulingIgnoredDuringExecution;
  let terms = required?.nodeSelectorTerms || [];
  if (!terms.length) {
    return true;
  }
  // Terms are ORed; expressions inside a term are ANDed.
  return terms.some((term) => (term.matchExpressions || []).every((expression) => {
    let value = labels[expression.key];
    let values = (expression.values || []).map((v) => `${v}`);
    switch (expression.operator) {
      case 'In': return values.includes(`${value}`);
      case 'NotIn': return !values.includes(`${value}`);
      case 'Exists': return value !== undefined;
      case 'DoesNotExist': return value === undefined;
      case 'Gt': return Number(value) > Number(values[0]);
      case 'Lt': return Number(value) < Number(values[0]);
      default: return false;
    }
  }));
}

function untoleratedTaint(node, pod) {
  let tolerations = pod?.spec?.tolerations || [];
  for (const taint of node?.spec?.taints || []) {
    if (!BLOCKING_TAINT_EFFECTS.has(taint.effect)) {
      continue;
    }
    let tolerated = tolerations.some((toleration) => {
      if (toleration.effect && toleration.effect !== taint.effect) {
        return false;
      }
      if (toleration.operator === 'Exists') {
        return !toleration.key || toleration.key === taint.key;
      }
      return toleration.key === taint.key && `${toleration.value}` === `${taint.value}`;
    });
    if (!tolerated) {
      return taint;
    }
  }
  return undefined;
}

// Returns { node } for every node, with `reason` set when it was rejected.
function filterNodes(pod, nodes, usage) {
  let requests = podRequests(pod);
  return nodes.map((node) => {
    let labels = plain(node.metadata?.labels);
    if (!isReady(node)) {
      return { node, reason: 'node(s) were not ready' };
    }
    if (node.spec?.unschedulable) {
      return { node, reason: 'node(s) were unschedulable' };
    }
    let taint = untoleratedTaint(node, pod);
    if (taint) {
      return { node, reason: `node(s) had untolerated taint {${taint.key}: ${taint.value ?? ''}}` };
    }
    if (!matchesSelector(labels, plain(pod.spec?.nodeSelector))) {
      return { node, reason: "node(s) didn't match Pod's node affinity/selector" };
    }
    if (!matchesNodeAffinity(labels, pod)) {
      return { node, reason: "node(s) didn't match Pod's node affinity/selector" };
    }
    let allocatable = nodeAllocatable(node);
    let used = usage.get(node.metadata.name) || { cpu: 0, memory: 0, pods: 0 };
    if (used.pods + 1 > allocatable.pods) {
      return { node, reason: 'Too many pods' };
    }
    if (used.cpu + requests.cpu > allocatable.cpu) {
      return { node, reason: 'Insufficient cpu' };
    }
    if (used.memory + requests.memory > allocatable.memory) {
      return { node, reason: 'Insufficient memory' };
    }
    return { node };
  });
}

// Least-allocated: prefer the node with the most room left, so pods spread
// rather than piling onto whichever node happens to sort first.
function scoreNode(node, pod, usage) {
  let allocatable = nodeAllocatable(node);
  let used = usage.get(node.metadata.name) || { cpu: 0, memory: 0, pods: 0 };
  let requests = podRequests(pod);
  let fraction = (free, total) => (Number.isFinite(total) && total > 0 ? Math.max(0, free) / total : 1);
  let cpuFree = fraction(allocatable.cpu - used.cpu - requests.cpu, allocatable.cpu);
  let memoryFree = fraction(allocatable.memory - used.memory - requests.memory, allocatable.memory);
  let score = ((cpuFree + memoryFree) / 2) * 100;

  // Preferred node affinity nudges the score without ever excluding a node.
  let preferred = pod?.spec?.affinity?.nodeAffinity?.preferredDuringSchedulingIgnoredDuringExecution || [];
  let labels = plain(node.metadata?.labels);
  for (const term of preferred) {
    let matched = (term.preference?.matchExpressions || []).every((expression) => {
      let value = labels[expression.key];
      let values = (expression.values || []).map((v) => `${v}`);
      return expression.operator === 'In' ? values.includes(`${value}`) : value !== undefined;
    });
    if (matched) {
      score += Number(term.weight) || 0;
    }
  }
  return score;
}

function summarise(rejections, total) {
  let counts = new Map();
  for (const reason of rejections) {
    counts.set(reason, (counts.get(reason) || 0) + 1);
  }
  let parts = [...counts.entries()].map(([reason, count]) => `${count} ${reason}`);
  return `0/${total} nodes are available: ${parts.join(', ')}.`;
}

function recordEvent(pod, { type, reason, message }) {
  let objRef = {
    kind: 'Pod',
    namespace: pod.metadata.namespace,
    name: pod.metadata.name,
    uid: pod.metadata.uid,
    apiVersion: 'v1',
    resourceVersion: pod.metadata.resourceVersion,
  };
  let timestamp = now();
  return Event.create({
    metadata: {
      name: `${pod.metadata.name}.${Date.now().toString(36)}`,
      namespace: pod.metadata.namespace || 'default',
    },
    involvedObject: objRef,
    regarding: objRef,
    reason,
    message,
    note: message,
    type,
    source: { component: SCHEDULER_NAME, host: '' },
    deprecatedSource: { component: SCHEDULER_NAME, host: '' },
    reportingController: SCHEDULER_NAME,
    reportingInstance: SCHEDULER_NAME,
    firstTimestamp: timestamp,
    lastTimestamp: timestamp,
    eventTime: timestamp,
    count: 1,
  }).catch(() => {});
}

function setScheduledCondition(pod, { status, reason, message }) {
  let condition = {
    type: 'PodScheduled',
    status,
    reason,
    message,
    lastTransitionTime: now(),
  };
  // Replace any existing PodScheduled rather than appending a second one.
  return Pod.Model.findOneAndUpdate(
    { 'metadata.uid': pod.metadata.uid },
    { $pull: { 'status.conditions': { type: 'PodScheduled' } } },
  ).then(() => Pod.Model.findOneAndUpdate(
    { 'metadata.uid': pod.metadata.uid },
    { $push: { 'status.conditions': condition } },
  )).catch(() => {});
}


async function schedulePod(pod) {
  if (!pod?.metadata?.uid || pod?.spec?.nodeName) {
    return undefined;
  }
  // Someone else's scheduler; leave it alone.
  let schedulerName = pod?.spec?.schedulerName;
  if (schedulerName && schedulerName !== SCHEDULER_NAME) {
    return undefined;
  }
  let phase = pod?.status?.phase;
  if (phase === 'Succeeded' || phase === 'Failed') {
    return undefined;
  }

  let [nodes, pods] = await Promise.all([Node.find({}), Pod.find({})]);
  if (!nodes.length) {
    return undefined;
  }
  let usage = usageByNode(pods);
  let results = filterNodes(pod, nodes, usage);
  let feasible = results.filter((r) => !r.reason).map((r) => r.node);

  if (!feasible.length) {
    let message = summarise(results.map((r) => r.reason), nodes.length);
    await setScheduledCondition(pod, { status: 'False', reason: 'Unschedulable', message });
    await recordEvent(pod, { type: 'Warning', reason: 'FailedScheduling', message });
    return undefined;
  }

  let best = feasible
    .map((node) => ({ node, score: scoreNode(node, pod, usage) }))
    .sort((a, b) => (b.score - a.score) || a.node.metadata.name.localeCompare(b.node.metadata.name))[0].node;

  // Bind. Kubernetes writes this through the pods/binding subresource; the
  // effect a client sees is the same.
  let updated = await Pod.Model.findOneAndUpdate(
    { 'metadata.uid': pod.metadata.uid, $or: [{ 'spec.nodeName': { $exists: false } }, { 'spec.nodeName': null }, { 'spec.nodeName': '' }] },
    { $set: { 'spec.nodeName': best.metadata.name } },
    { new: true },
  );
  if (!updated) {
    // Something bound it first — nothing to announce.
    return undefined;
  }
  await setScheduledCondition(pod, { status: 'True' });
  await recordEvent(pod, {
    type: 'Normal',
    reason: 'Scheduled',
    message: `Successfully assigned ${pod.metadata.namespace}/${pod.metadata.name} to ${best.metadata.name}`,
  });
  return best.metadata.name;
}

function start() {
  busFor('Pod').on('created', (pod) => {
    schedulePod(pod).catch((err) => console.warn('[scheduler]', err?.message || err));
  });
  // Retry loop: picks up pods created before the bus was wired, and gives
  // pods that were unschedulable another chance once the cluster changes.
  let tick = async () => {
    try {
      let pending = await Pod.find({
        $or: [{ 'spec.nodeName': { $exists: false } }, { 'spec.nodeName': null }, { 'spec.nodeName': '' }],
      });
      for (const pod of pending) {
        await schedulePod(pod).catch(() => {});
      }
    } catch (e) { /* next tick */ }
  };
  setInterval(tick, 5000);
  tick();
}

module.exports = {
  start,
  schedulePod,
  // Exported for tests and for anyone wanting to reason about a placement
  // without waiting for the loop.
  filterNodes,
  scoreNode,
  podRequests,
  usageByNode,
  SCHEDULER_NAME,
};
