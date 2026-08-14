// The endpoints controller: which pods is a Service actually pointing at?
//
// A Service with a selector had no Endpoints object at all here, and that is a
// bigger hole than it sounds. Endpoints is the thing that says a service has
// backends: an operator waiting for its workload to become reachable polls
// Endpoints, an Ingress controller reads it to build a backend list, and
// `kubectl get endpoints` is how anyone checks whether a selector matches what
// they think it matches. Without it, every service in this simulator looked
// permanently empty, and code that waited for a backend waited forever.
//
// The controller is deliberately level-triggered rather than incremental: on
// any relevant change it recomputes the whole set for that service from the
// pods that exist right now. Incremental endpoint bookkeeping is where real
// clusters grow their subtlest bugs, and there is nothing to gain from it at
// this scale.
const Service = require('../objects/service.js');
const Pod = require('../objects/pod.js');
const Endpoints = require('../objects/endpoints.js');
const { busFor } = require('../objects/bus.js');

// Mongoose hands these back as Maps unless toObject is asked to flatten them,
// and Object.entries on a Map is empty rather than wrong -- which reads as "no
// selector" and quietly selects nothing.
function plain(value) {
  if (!value) {
    return {};
  }
  if (value instanceof Map) {
    return Object.fromEntries(value);
  }
  return typeof value.toObject === 'function' ? value.toObject({ flattenMaps: true }) : value;
}

// A service selector is equality-only -- every key must match exactly. This is
// not the set-based selector syntax; Service predates it and never gained it.
function matches(pod, selector) {
  let labels = plain(pod?.metadata?.labels);
  return Object.entries(selector).every(([key, value]) => `${labels[key]}` === `${value}`);
}

function isReady(pod) {
  let ready = (pod?.status?.conditions || []).find((c) => c.type === 'Ready');
  return pod?.status?.phase === 'Running' && ready?.status === 'True';
}

// targetPort may name a container port rather than give a number, which is the
// whole reason a pod's ports have names. Resolving it against the pod means a
// service whose targetPort is "http" reports the port that container actually
// listens on, not the string.
function resolvePort(servicePort, pod) {
  let target = servicePort.targetPort ?? servicePort.port;
  if (typeof target === 'number' || /^\d+$/.test(`${target}`)) {
    return Number(target);
  }
  for (const container of pod?.spec?.containers || []) {
    for (const port of container.ports || []) {
      if (port.name === target) {
        return Number(port.containerPort);
      }
    }
  }
  return Number(servicePort.port);
}

function addressFor(pod) {
  return {
    ip: pod.status?.podIP || '',
    nodeName: pod.spec?.nodeName || undefined,
    targetRef: {
      kind: 'Pod',
      namespace: pod.metadata.namespace,
      name: pod.metadata.name,
      uid: pod.metadata.uid,
    },
  };
}

// Endpoints for one service, from the pods as they are now. A pod with no IP
// yet is left out of both lists entirely: an address with an empty ip is not a
// backend that is merely unready, it is a row that would make a client dial
// nothing.
function subsetsFor(service, pods) {
  let selector = plain(service.spec?.selector);
  if (!Object.keys(selector).length) {
    return [];
  }
  let selected = pods.filter((pod) => matches(pod, selector) && pod.status?.podIP);
  if (!selected.length) {
    return [];
  }
  let ready = selected.filter(isReady);
  let notReady = selected.filter((pod) => !isReady(pod));
  let ports = (service.spec?.ports || []).map((port) => ({
    name: port.name || undefined,
    port: resolvePort(port, selected[0]),
    protocol: port.protocol || 'TCP',
  }));
  return [{
    addresses: ready.map(addressFor),
    notReadyAddresses: notReady.map(addressFor),
    ports,
  }];
}

function sameSubsets(a, b) {
  return JSON.stringify(plainSubsets(a)) === JSON.stringify(plainSubsets(b));
}

function plainSubsets(subsets) {
  return (subsets || []).map((subset) => ({
    addresses: (subset.addresses || []).map((a) => ({ ip: a.ip, nodeName: a.nodeName, name: a.targetRef?.name })),
    notReadyAddresses: (subset.notReadyAddresses || []).map((a) => ({ ip: a.ip, nodeName: a.nodeName, name: a.targetRef?.name })),
    ports: (subset.ports || []).map((p) => ({ name: p.name, port: p.port, protocol: p.protocol })),
  }));
}

async function reconcileService(service) {
  if (!service?.metadata?.name) {
    return undefined;
  }
  // A headless service without a selector is somebody else's to populate --
  // that is the documented way to point a Service at addresses you manage
  // yourself, and overwriting it would delete their work.
  if (!Object.keys(plain(service.spec?.selector)).length) {
    return undefined;
  }
  let namespace = service.metadata.namespace;
  let pods = await Pod.find({ 'metadata.namespace': namespace });
  let subsets = subsetsFor(service, pods);
  let existing = await Endpoints.findOne({
    'metadata.name': service.metadata.name,
    'metadata.namespace': namespace,
  }).catch(() => undefined);

  if (!existing) {
    return Endpoints.create({
      apiVersion: 'v1',
      kind: 'Endpoints',
      metadata: {
        name: service.metadata.name,
        namespace,
        labels: { 'kubernetes.io/service-name': service.metadata.name },
      },
      subsets,
    });
  }
  // Rewriting identical endpoints would bump resourceVersion on every pod
  // event in the namespace, and every watcher would see a change that isn't
  // one.
  if (sameSubsets(existing.subsets, subsets)) {
    return existing;
  }
  return new Endpoints(existing).patch({ $set: { subsets } });
}

async function reconcileNamespace(namespace) {
  let services = await Service.find({ 'metadata.namespace': namespace });
  for (const service of services) {
    await reconcileService(service).catch(() => {});
  }
}

function start() {
  busFor('Service').on('created', (service) => {
    reconcileService(service).catch((err) => console.warn('[endpoints]', err?.message || err));
  });
  busFor('Service').on('updated', (service) => {
    reconcileService(service).catch(() => {});
  });
  // A pod changing is a change to every service that selects it, and the
  // cheapest correct answer is to recompute the namespace.
  for (const event of ['created', 'updated', 'deleted']) {
    busFor('Pod').on(event, (pod) => {
      reconcileNamespace(pod?.metadata?.namespace).catch(() => {});
    });
  }
  // Pods become ready in the background, without an API write to notice, so a
  // periodic pass is what actually moves an address from notReady to ready.
  let tick = () => Service.find({})
    .then((services) => services.reduce(
      (chain, service) => chain.then(() => reconcileService(service).catch(() => {})),
      Promise.resolve(),
    ))
    .catch(() => {});
  setInterval(tick, 5000);
  tick();
}

module.exports = { start, reconcileService, reconcileNamespace, subsetsFor };
