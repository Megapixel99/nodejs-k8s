// A fleet of simulated nodes.
//
// Pods still run as containers on the host — the nodes are logical, and exist
// so that scheduling has something to decide between. That is the point: an
// operator author wants to watch their controller react to a pod that lands on
// a particular node, to a node going unschedulable, or to a pod that fits
// nowhere. None of that is observable with a single node.
//
// Configure with SIM_NODES (count), SIM_NODE_CPU, SIM_NODE_MEMORY,
// SIM_NODE_PODS, SIM_NODE_ZONES (comma-separated). Set SIM_NODES=0 to manage
// nodes yourself.
const Node = require('../objects/node.js');

const DEFAULTS = {
  count: 3,
  cpu: '4',
  memory: '8Gi',
  pods: '110',
  zones: 'zone-a,zone-b,zone-c',
};

function settings() {
  let count = process.env.SIM_NODES === undefined ? DEFAULTS.count : Number(process.env.SIM_NODES);
  return {
    count: Number.isFinite(count) && count >= 0 ? count : DEFAULTS.count,
    cpu: process.env.SIM_NODE_CPU || DEFAULTS.cpu,
    memory: process.env.SIM_NODE_MEMORY || DEFAULTS.memory,
    pods: process.env.SIM_NODE_PODS || DEFAULTS.pods,
    zones: (process.env.SIM_NODE_ZONES || DEFAULTS.zones).split(',').map((z) => z.trim()).filter(Boolean),
  };
}

function nodeSpec(index, config) {
  let name = `sim-node-${index + 1}`;
  let zone = config.zones[index % config.zones.length] || 'zone-a';
  let capacity = {
    cpu: config.cpu,
    memory: config.memory,
    pods: config.pods,
    'ephemeral-storage': '100Gi',
  };
  return {
    apiVersion: 'v1',
    kind: 'Node',
    metadata: {
      name,
      labels: {
        'kubernetes.io/hostname': name,
        'kubernetes.io/os': 'linux',
        'kubernetes.io/arch': 'amd64',
        'topology.kubernetes.io/zone': zone,
        'topology.kubernetes.io/region': 'sim',
        'node.kubernetes.io/instance-type': 'sim',
      },
    },
    spec: {},
    status: {
      capacity,
      // Node.create copies capacity into allocatable.
      addresses: [
        { type: 'InternalIP', address: `10.244.${index}.1` },
        { type: 'Hostname', address: name },
      ],
    },
  };
}

// Idempotent: only creates what isn't there, so a restart against an existing
// database doesn't disturb nodes or the pods assigned to them.
async function ensure() {
  let config = settings();
  if (config.count === 0) {
    return [];
  }
  let created = [];
  for (let index = 0; index < config.count; index++) {
    let spec = nodeSpec(index, config);
    let existing = await Node.findOne({ 'metadata.name': spec.metadata.name }).catch(() => null);
    if (existing) {
      continue;
    }
    await Node.create(spec).catch((err) => {
      console.warn(`[nodes] could not create ${spec.metadata.name}:`, err?.message || err);
    });
    created.push(spec.metadata.name);
  }
  if (created.length) {
    console.log(`[nodes] simulated fleet: ${created.join(', ')} (${config.cpu} cpu / ${config.memory} each)`);
  }
  return created;
}

module.exports = { ensure, settings, nodeSpec };
