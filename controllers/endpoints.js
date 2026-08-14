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
const { createHash } = require('crypto');
const Service = require('../objects/service.js');
const Pod = require('../objects/pod.js');
const Node = require('../objects/node.js');
const Endpoints = require('../objects/endpoints.js');
const EndpointSlice = require('../objects/endpointSlice.js');
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

// ---- EndpointSlices -------------------------------------------------------
//
// The same information as Endpoints, in the shape everything written since
// 1.21 actually reads. Kubernetes added slices because a Service with
// thousands of backends is one enormous Endpoints object that every watcher
// re-receives in full on every pod change; the slice API shards that, and
// carries per-endpoint detail Endpoints has nowhere to put -- serving and
// terminating as distinct from ready, and the zone an address is in, which is
// what topology-aware routing decides on.
//
// One slice per service here. Sharding exists for scale this simulator will
// never see, and a controller reading slices cannot tell the difference: it is
// told to expect one or many either way.

// Real slices are named `<service>-<5 random chars>`. Random would mean a new
// slice on every restart and orphans left behind, so the suffix is derived
// from the service instead: same service, same slice, forever.
function sliceName(service) {
  let digest = createHash('sha1')
    .update(`${service.metadata.namespace}/${service.metadata.name}`)
    .digest('hex');
  return `${service.metadata.name}-${digest.slice(0, 5)}`;
}

function endpointsFor(service, pods, zones) {
  let selector = plain(service.spec?.selector);
  let selected = pods.filter((pod) => matches(pod, selector) && pod.status?.podIP);
  return selected.map((pod) => {
    let ready = isReady(pod);
    return {
      addresses: [pod.status.podIP],
      conditions: {
        ready,
        // `serving` is ready-without-regard-to-termination, and `terminating`
        // says the pod is going away. A client draining connections needs both
        // to distinguish "not ready yet" from "ready but leaving".
        serving: ready,
        terminating: Boolean(pod.metadata?.deletionTimestamp),
      },
      nodeName: pod.spec?.nodeName || undefined,
      zone: zones.get(pod.spec?.nodeName) || undefined,
      targetRef: {
        kind: 'Pod',
        namespace: pod.metadata.namespace,
        name: pod.metadata.name,
        uid: pod.metadata.uid,
      },
    };
  });
}

function slicePortsFor(service, pods) {
  let selector = plain(service.spec?.selector);
  let sample = pods.find((pod) => matches(pod, selector) && pod.status?.podIP);
  return (service.spec?.ports || []).map((port) => ({
    name: port.name || undefined,
    port: resolvePort(port, sample),
    protocol: port.protocol || 'TCP',
    appProtocol: port.appProtocol || undefined,
  }));
}

function sameSlice(existing, endpoints, ports) {
  let strip = (list) => (list || []).map((e) => ({
    addresses: e.addresses,
    conditions: { ready: !!e.conditions?.ready, serving: !!e.conditions?.serving, terminating: !!e.conditions?.terminating },
    nodeName: e.nodeName,
    zone: e.zone,
    name: e.targetRef?.name,
  }));
  let stripPorts = (list) => (list || []).map((p) => ({ name: p.name, port: p.port, protocol: p.protocol }));
  return JSON.stringify(strip(existing.endpoints)) === JSON.stringify(strip(endpoints))
    && JSON.stringify(stripPorts(existing.ports)) === JSON.stringify(stripPorts(ports));
}

async function reconcileSlice(service, pods, zones) {
  let name = sliceName(service);
  let namespace = service.metadata.namespace;
  let endpoints = endpointsFor(service, pods, zones);
  let ports = slicePortsFor(service, pods);
  let existing = await EndpointSlice.findOne({
    'metadata.name': name,
    'metadata.namespace': namespace,
  }).catch(() => undefined);

  if (!existing) {
    return EndpointSlice.create({
      apiVersion: 'discovery.k8s.io/v1',
      kind: 'EndpointSlice',
      metadata: {
        name,
        namespace,
        // The label is how a client finds the slices for a service: there is
        // no field selector for it, and the name is not meant to be guessed.
        labels: {
          'kubernetes.io/service-name': service.metadata.name,
          'endpointslice.kubernetes.io/managed-by': 'endpointslice-controller.k8s.io',
        },
        ownerReferences: [{
          apiVersion: 'v1',
          kind: 'Service',
          name: service.metadata.name,
          uid: service.metadata.uid,
          controller: true,
          blockOwnerDeletion: true,
        }],
      },
      addressType: 'IPv4',
      endpoints,
      ports,
    });
  }
  if (sameSlice(existing, endpoints, ports)) {
    return existing;
  }
  return new EndpointSlice(existing).patch({ $set: { endpoints, ports } });
}

// Which zone each node is in, for the slice's per-endpoint `zone`. Read once
// per pass rather than once per endpoint.
async function nodeZones() {
  let nodes = await Node.find({}).catch(() => []);
  return new Map(nodes.map((node) => {
    let labels = plain(node.metadata?.labels);
    return [node.metadata?.name, labels['topology.kubernetes.io/zone']];
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
  // Both shapes describe the same backends, and both are kept: `kubectl get
  // endpoints` and older controllers read one, everything written since 1.21
  // reads the other, and a simulator that offered only one would send half its
  // users looking for a bug in their own code.
  await reconcileSlice(service, pods, await nodeZones()).catch((err) => {
    console.warn('[endpointslices]', err?.message || err);
  });
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
