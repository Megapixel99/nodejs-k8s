// Services and the Endpoints behind them.
//
// Endpoints is how anything finds out whether a Service has backends: an
// operator polls it while waiting for its workload to come up, an ingress
// controller builds a backend list from it, and a person runs `kubectl get
// endpoints` to check that a selector matches what they think it matches. A
// Service whose selector silently matches nothing looks exactly like a Service
// whose pods haven't started, which is why most of what follows asserts on
// *which* pods ended up in the list rather than on whether a list exists.
//
// Requires the server + mongo + docker (the pods have to actually run for
// their addresses to be ready).
const base = 'http://localhost:8080';
const ns = '/api/v1/namespaces/default';

let fails = [];
let passes = 0;

function check(name, condition, got) {
  if (condition) {
    passes++;
    return;
  }
  fails.push(`${name} -> got ${JSON.stringify(got)}`);
}

async function req(method, path, body) {
  let res = await fetch(`${base}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  let text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch (e) {
    return { status: res.status, body: text };
  }
}

const settle = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const addressesOf = (endpoints) => (endpoints?.subsets || [])
  .flatMap((s) => (s.addresses || []).map((a) => a.targetRef?.name))
  .filter(Boolean)
  .sort();

const notReadyOf = (endpoints) => (endpoints?.subsets || [])
  .flatMap((s) => (s.notReadyAddresses || []).map((a) => a.targetRef?.name))
  .filter(Boolean)
  .sort();

async function waitForEndpoints(name, predicate, ms = 20000) {
  let deadline = Date.now() + ms;
  let endpoints;
  while (Date.now() < deadline) {
    endpoints = (await req('GET', `${ns}/endpoints/${name}`)).body;
    if (endpoints?.metadata?.name && predicate(endpoints)) {
      return endpoints;
    }
    await settle(500);
  }
  return endpoints;
}

const podSpec = (name, labels) => ({
  apiVersion: 'v1',
  kind: 'Pod',
  metadata: { name, namespace: 'default', labels },
  spec: {
    containers: [{
      name: 'c',
      image: 'busybox',
      command: ['sh', '-c', 'sleep 300'],
      ports: [{ name: 'http', containerPort: 8080 }],
    }],
  },
});

(async () => {
  let reachable = await fetch(`${base}/api`).then(() => true).catch(() => false);
  if (!reachable) {
    console.log(`nothing listening on ${base}; start the server first`);
    process.exit(1);
  }

  let suffix = Date.now().toString(36);
  let created = { pods: [], services: [] };
  let makePod = async (name, labels) => {
    created.pods.push(name);
    return req('POST', `${ns}/pods`, podSpec(name, labels));
  };
  let makeService = async (name, spec) => {
    created.services.push(name);
    return req('POST', `${ns}/services`, {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: { name, namespace: 'default' },
      spec,
    });
  };

  // The selector key has a dot in it on purpose. `app.kubernetes.io/name` is
  // the label half of Kubernetes uses, and a selector stored somewhere that
  // can't hold a dotted key doesn't fail -- it matches nothing, and the
  // Service looks like it simply has no backends yet.
  let app = `svc-${suffix}`;
  let labels = { 'app.kubernetes.io/name': app };
  await makePod(`${app}-a`, labels);
  await makePod(`${app}-b`, labels);
  await makePod(`${app}-other`, { 'app.kubernetes.io/name': `${app}-different` });

  let service = await makeService(app, {
    selector: labels,
    ports: [{ name: 'http', port: 80, targetPort: 8080, protocol: 'TCP' }],
  });
  check('a service is created', service.status === 201 || service.status === 200, service.status);
  check('the dotted selector survives the round trip',
    service.body?.spec?.selector?.['app.kubernetes.io/name'] === app, service.body?.spec?.selector);

  let endpoints = await waitForEndpoints(app, (e) => addressesOf(e).length >= 2);
  check('a service with a selector gets an Endpoints object', Boolean(endpoints?.metadata?.name), endpoints);
  check('endpoints list the pods the selector matches',
    addressesOf(endpoints).join() === [`${app}-a`, `${app}-b`].join(), addressesOf(endpoints));
  check('endpoints leave out pods the selector does not match',
    !addressesOf(endpoints).includes(`${app}-other`), addressesOf(endpoints));

  let addresses = (endpoints?.subsets || []).flatMap((s) => s.addresses || []);
  check('each address carries the pod IP', addresses.every((a) => /^\d+\.\d+\.\d+\.\d+$/.test(`${a.ip}`)), addresses.map((a) => a.ip));
  check('each address points back at its pod',
    addresses.every((a) => a.targetRef?.kind === 'Pod' && a.targetRef?.uid), addresses.map((a) => a.targetRef));
  check('each address names the node the pod is on',
    addresses.every((a) => `${a.nodeName}`.startsWith('sim-node-')), addresses.map((a) => a.nodeName));

  // targetPort names a container port here, so a server that echoed the string
  // back would hand a client a port it can't dial.
  let ports = (endpoints?.subsets || []).flatMap((s) => s.ports || []);
  check('endpoint ports are resolved to numbers', ports.every((p) => Number.isInteger(p.port)), ports);
  check('the resolved port is the container port', ports.every((p) => p.port === 8080), ports);
  check('endpoint ports keep their name and protocol',
    ports.every((p) => p.name === 'http' && p.protocol === 'TCP'), ports);

  // Deleting a backend has to remove it: stale endpoints send traffic to a pod
  // that is gone, and nothing about the Service itself changed to signal it.
  await req('DELETE', `${ns}/pods/${app}-b`);
  let afterDelete = await waitForEndpoints(app, (e) => !addressesOf(e).includes(`${app}-b`));
  check('deleting a pod removes it from the endpoints',
    !addressesOf(afterDelete).includes(`${app}-b`), addressesOf(afterDelete));
  check('the other backend is still listed', addressesOf(afterDelete).includes(`${app}-a`), addressesOf(afterDelete));

  // A pod that matches but isn't ready belongs in notReadyAddresses, not in
  // addresses: a client that dialled it would get a connection refused, and a
  // client that ignored it entirely couldn't tell it was coming.
  await req('POST', `${ns}/pods`, {
    ...podSpec(`${app}-pending`, labels),
    spec: {
      ...podSpec(`${app}-pending`, labels).spec,
      nodeSelector: { 'kubernetes.io/hostname': 'no-such-node' },
    },
  });
  created.pods.push(`${app}-pending`);
  await settle(6000);
  let withPending = (await req('GET', `${ns}/endpoints/${app}`)).body;
  check('an unschedulable pod is in neither address list',
    !addressesOf(withPending).includes(`${app}-pending`)
      && !notReadyOf(withPending).includes(`${app}-pending`),
    { ready: addressesOf(withPending), notReady: notReadyOf(withPending) });

  // EndpointSlices carry the same backends in the shape everything written
  // since 1.21 reads. A controller that asks for slices and finds none
  // concludes the service has no backends -- it does not fall back to
  // Endpoints -- so "we have Endpoints" is not an answer.
  let slices = await req('GET', `/apis/discovery.k8s.io/v1/namespaces/default/endpointslices?labelSelector=${
    encodeURIComponent(`kubernetes.io/service-name=${app}`)}`);
  let slice = slices.body?.items?.[0];
  check('a service with a selector gets an EndpointSlice', Boolean(slice), slices.body?.items?.length);
  check('the slice is found by the service-name label',
    slice?.metadata?.labels?.['kubernetes.io/service-name'] === app, slice?.metadata?.labels);
  check('the slice says who manages it',
    Boolean(slice?.metadata?.labels?.['endpointslice.kubernetes.io/managed-by']), slice?.metadata?.labels);
  check('the slice is owned by its service',
    slice?.metadata?.ownerReferences?.[0]?.kind === 'Service'
      && slice?.metadata?.ownerReferences?.[0]?.name === app,
    slice?.metadata?.ownerReferences);
  check('the slice declares its address type', slice?.addressType === 'IPv4', slice?.addressType);

  let sliceEndpoints = slice?.endpoints || [];
  check('the slice lists the surviving backend',
    sliceEndpoints.map((e) => e.targetRef?.name).join() === `${app}-a`,
    sliceEndpoints.map((e) => e.targetRef?.name));
  check('each slice endpoint carries an address',
    sliceEndpoints.every((e) => /^\d+\.\d+\.\d+\.\d+$/.test(`${e.addresses?.[0]}`)),
    sliceEndpoints.map((e) => e.addresses));
  // targetRef is an ObjectReference here, not the {ip, nodeName} shape
  // Endpoints uses; storing it under the wrong schema dropped every field.
  check('each slice endpoint points back at its pod',
    sliceEndpoints.every((e) => e.targetRef?.kind === 'Pod' && e.targetRef?.uid && e.targetRef?.namespace),
    sliceEndpoints.map((e) => e.targetRef));
  check('slice conditions distinguish ready, serving and terminating',
    sliceEndpoints.every((e) => e.conditions?.ready === true && e.conditions?.serving === true && e.conditions?.terminating === false),
    sliceEndpoints.map((e) => e.conditions));
  check('each slice endpoint names its node and zone',
    sliceEndpoints.every((e) => `${e.nodeName}`.startsWith('sim-node-') && `${e.zone}`.length > 0),
    sliceEndpoints.map((e) => [e.nodeName, e.zone]));
  check('slice ports are resolved the same way endpoints are',
    (slice?.ports || []).every((p) => p.port === 8080 && p.protocol === 'TCP' && p.name === 'http'),
    slice?.ports);

  // The slice name has to be stable: a fresh random suffix on every pass would
  // leave a trail of orphaned slices, each claiming to describe the service.
  await settle(6000);
  let sliceAgain = await req('GET', `/apis/discovery.k8s.io/v1/namespaces/default/endpointslices?labelSelector=${
    encodeURIComponent(`kubernetes.io/service-name=${app}`)}`);
  check('reconciling does not create a second slice', sliceAgain.body?.items?.length === 1, sliceAgain.body?.items?.length);
  check('the slice keeps its name',
    sliceAgain.body?.items?.[0]?.metadata?.name === slice?.metadata?.name,
    [slice?.metadata?.name, sliceAgain.body?.items?.[0]?.metadata?.name]);

  let sliceTable = await fetch(`${base}/apis/discovery.k8s.io/v1/namespaces/default/endpointslices`, {
    headers: { Accept: 'application/json;as=Table;v=v1;g=meta.k8s.io' },
  }).then((r) => r.json());
  let sliceColumns = (sliceTable.columnDefinitions || []).map((c) => c.name);
  check('the endpointslice table has the columns kubectl prints',
    sliceColumns.join() === ['Name', 'AddressType', 'Ports', 'Endpoints', 'Age'].join(), sliceColumns);

  // A Service with no selector is somebody else's to fill in -- that is the
  // documented way to point a Service at addresses you manage yourself.
  let manual = `svc-manual-${suffix}`;
  await makeService(manual, { ports: [{ port: 80, protocol: 'TCP' }] });
  await req('POST', `${ns}/endpoints`, {
    apiVersion: 'v1',
    kind: 'Endpoints',
    metadata: { name: manual, namespace: 'default' },
    subsets: [{ addresses: [{ ip: '10.9.9.9' }], ports: [{ port: 80, protocol: 'TCP' }] }],
  });
  await settle(6000);
  let untouched = (await req('GET', `${ns}/endpoints/${manual}`)).body;
  check('a selectorless service keeps hand-written endpoints',
    (untouched?.subsets || [])[0]?.addresses?.[0]?.ip === '10.9.9.9', untouched?.subsets);

  // The table is what `kubectl get endpoints` prints, header included.
  let table = await fetch(`${base}${ns}/endpoints`, {
    headers: { Accept: 'application/json;as=Table;v=v1;g=meta.k8s.io' },
  }).then((r) => r.json());
  let columns = (table.columnDefinitions || []).map((c) => c.name);
  check('the endpoints table has the columns kubectl prints',
    columns.join() === ['Name', 'Endpoints', 'Age'].join(), columns);
  let row = (table.rows || []).find((r) => r.cells?.[0] === app);
  check('the endpoints row lists address:port', /^\d+\.\d+\.\d+\.\d+:\d+/.test(`${row?.cells?.[1]}`), row?.cells);

  let serviceTable = await fetch(`${base}${ns}/services`, {
    headers: { Accept: 'application/json;as=Table;v=v1;g=meta.k8s.io' },
  }).then((r) => r.json());
  let serviceRow = (serviceTable.rows || []).find((r) => r.cells?.[0] === app);
  // Find the column by name rather than by position: asserting on a cell index
  // means the test starts checking a different column the day one is added.
  let portsColumn = (serviceTable.columnDefinitions || []).findIndex((c) => /^Port/i.test(c.name));
  // "80/undefined" is what an omitted protocol used to render as.
  check('the service PORT(S) column defaults the protocol',
    portsColumn >= 0 && /^\d+\/[A-Z]+$/.test(`${serviceRow?.cells?.[portsColumn]}`),
    { portsColumn, cells: serviceRow?.cells });

  // Deleting the service should not leave endpoints pointing at nothing.
  await req('DELETE', `${ns}/services/${app}`);
  await settle(2000);
  let orphaned = await req('GET', `${ns}/endpoints/${app}`);
  check('deleting a service removes its endpoints', orphaned.status === 404, orphaned.status);
  let orphanedSlices = await req('GET', `/apis/discovery.k8s.io/v1/namespaces/default/endpointslices?labelSelector=${
    encodeURIComponent(`kubernetes.io/service-name=${app}`)}`);
  check('deleting a service removes its endpointslices',
    (orphanedSlices.body?.items || []).length === 0,
    (orphanedSlices.body?.items || []).map((s) => s.metadata?.name));

  for (const name of created.pods) {
    await req('DELETE', `${ns}/pods/${name}`);
  }
  for (const name of created.services) {
    await req('DELETE', `${ns}/services/${name}`);
    await req('DELETE', `${ns}/endpoints/${name}`);
  }

  console.log('---FAILS---');
  fails.forEach((f) => console.log(f));
  console.log(`\n${fails.length} fails, ${passes} passes.`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => {
  console.log(`the suite itself blew up: ${e.stack}`);
  process.exit(1);
});
