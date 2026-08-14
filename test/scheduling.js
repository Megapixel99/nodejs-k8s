// Scheduling behaviour. The point of a scheduler in a simulator is not that
// pods end up somewhere — it is that they end up somewhere *for a reason a
// client can see*: spec.nodeName, the PodScheduled condition, and a Scheduled
// or FailedScheduling event. A controller author testing against this needs
// the unhappy paths to be real too, so most of what follows asserts that a pod
// which should not be placed isn't, and says why.
//
// Requires the server + mongo. No docker: every pod here is created with a
// nodeSelector or resource request that keeps it Pending, or is deleted before
// its container matters.
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

// The scheduler binds on the create event, so a short wait is enough; the
// retry loop is a fallback, not the mechanism.
async function waitForPlacement(name, ms = 6000) {
  let deadline = Date.now() + ms;
  let pod;
  while (Date.now() < deadline) {
    pod = (await req('GET', `${ns}/pods/${name}`)).body;
    // Wait for the condition too: binding and the condition are two writes,
    // and reading between them sees a placed pod with no PodScheduled yet.
    if (pod?.spec?.nodeName && (pod.status?.conditions || []).some((c) => c.type === 'PodScheduled')) {
      return pod;
    }
    let scheduled = (pod?.status?.conditions || []).find((c) => c.type === 'PodScheduled');
    if (scheduled?.status === 'False') {
      return pod;
    }
    await settle(300);
  }
  return pod;
}

const podSpec = (name, spec = {}) => ({
  apiVersion: 'v1',
  kind: 'Pod',
  metadata: { name, namespace: 'default' },
  spec: {
    // Nothing here should actually run; these pods are about placement.
    containers: [{ name: 'c', image: 'busybox', command: ['sh', '-c', 'sleep 300'] }],
    ...spec,
  },
});

const conditionOf = (pod, type) => (pod?.status?.conditions || []).find((c) => c.type === type);

async function eventsFor(name) {
  let events = await req('GET', `${ns}/events`);
  return (events.body?.items || []).filter((e) => e.involvedObject?.name === name);
}

(async () => {
  let reachable = await fetch(`${base}/api`).then(() => true).catch(() => false);
  if (!reachable) {
    console.log(`nothing listening on ${base}; start the server first`);
    process.exit(1);
  }

  let nodes = (await req('GET', '/api/v1/nodes')).body?.items || [];
  let simNodes = nodes.filter((n) => `${n.metadata?.name}`.startsWith('sim-node-'));
  check('the simulated fleet exists', simNodes.length >= 3, simNodes.map((n) => n.metadata.name));
  check('nodes report capacity', simNodes.every((n) => n.status?.capacity?.cpu), simNodes[0]?.status?.capacity);
  check('nodes report allocatable', simNodes.every((n) => n.status?.allocatable?.cpu), simNodes[0]?.status?.allocatable);
  check('nodes carry topology labels',
    simNodes.every((n) => n.metadata?.labels?.['topology.kubernetes.io/zone']),
    simNodes[0]?.metadata?.labels);

  let suffix = Date.now().toString(36);
  let created = [];
  let make = async (name, spec) => {
    created.push(name);
    await req('POST', `${ns}/pods`, podSpec(name, spec));
    return waitForPlacement(name);
  };

  // 1. A pod with no constraints lands somewhere, with the condition and the
  //    event that say so.
  let plain = await make(`sc-plain-${suffix}`, {});
  check('an unconstrained pod is placed', Boolean(plain?.spec?.nodeName), plain?.spec?.nodeName);
  check('placement sets PodScheduled=True', conditionOf(plain, 'PodScheduled')?.status === 'True', conditionOf(plain, 'PodScheduled'));
  // Conditions are keyed by type; two PodScheduled entries means a client
  // reading "the" condition gets whichever it happens to find first.
  let scheduledConditions = (plain?.status?.conditions || []).filter((c) => c.type === 'PodScheduled');
  check('there is exactly one PodScheduled condition', scheduledConditions.length === 1, scheduledConditions.length);
  let placedEvents = await eventsFor(`sc-plain-${suffix}`);
  let scheduledEvent = placedEvents.find((e) => e.reason === 'Scheduled');
  check('placement emits a Scheduled event', Boolean(scheduledEvent), placedEvents.map((e) => e.reason));
  check('the Scheduled event names the node',
    `${scheduledEvent?.message}`.includes(plain?.spec?.nodeName || 'no-node'), scheduledEvent?.message);

  // 2. nodeSelector is honoured, not ignored.
  let target = simNodes[1].metadata.name;
  let selected = await make(`sc-select-${suffix}`, {
    nodeSelector: { 'kubernetes.io/hostname': target },
  });
  check('nodeSelector picks the node it names', selected?.spec?.nodeName === target, selected?.spec?.nodeName);

  // 3. A selector nothing matches leaves the pod Pending and says why.
  let impossible = await make(`sc-nowhere-${suffix}`, {
    nodeSelector: { 'kubernetes.io/hostname': 'no-such-node' },
  });
  check('an unsatisfiable selector leaves the pod unplaced', !impossible?.spec?.nodeName, impossible?.spec?.nodeName);
  check('an unplaced pod is Pending', impossible?.status?.phase === 'Pending', impossible?.status?.phase);
  let unschedulable = conditionOf(impossible, 'PodScheduled');
  check('an unplaced pod reports PodScheduled=False', unschedulable?.status === 'False', unschedulable);
  check('the condition reason is Unschedulable', unschedulable?.reason === 'Unschedulable', unschedulable?.reason);
  check('the condition explains which predicate rejected the nodes',
    `${unschedulable?.message}`.includes("didn't match Pod's node affinity/selector"), unschedulable?.message);
  let failedEvents = await eventsFor(`sc-nowhere-${suffix}`);
  let failedEvent = failedEvents.find((e) => e.reason === 'FailedScheduling');
  check('an unplaced pod emits FailedScheduling', Boolean(failedEvent), failedEvents.map((e) => e.reason));
  check('FailedScheduling is a Warning', failedEvent?.type === 'Warning', failedEvent?.type);
  check('the event counts the nodes it rejected',
    /^0\/\d+ nodes are available/.test(`${failedEvent?.message}`), failedEvent?.message);

  // 4. Resource requests are real: ask for more CPU than any node has.
  let huge = await make(`sc-huge-${suffix}`, {
    containers: [{
      name: 'c', image: 'busybox', command: ['sh', '-c', 'sleep 300'],
      resources: { requests: { cpu: '1000', memory: '1Ki' } },
    }],
  });
  check('a pod larger than any node is not placed', !huge?.spec?.nodeName, huge?.spec?.nodeName);
  check('the reason is insufficient cpu',
    `${conditionOf(huge, 'PodScheduled')?.message}`.includes('Insufficient cpu'),
    conditionOf(huge, 'PodScheduled')?.message);

  // 5. A request that fits is placed, and the request is what gets counted —
  //    a quantity like "250m" must not be read as 250 cores or as zero.
  let fits = await make(`sc-fits-${suffix}`, {
    containers: [{
      name: 'c', image: 'busybox', command: ['sh', '-c', 'sleep 300'],
      resources: { requests: { cpu: '250m', memory: '64Mi' } },
    }],
  });
  check('a pod that fits is placed', Boolean(fits?.spec?.nodeName), fits?.spec?.nodeName);

  // 6. A tainted node is skipped unless the pod tolerates it.
  let tainted = simNodes[2].metadata.name;
  await req('PATCH', `/api/v1/nodes/${tainted}`, undefined);
  await fetch(`${base}/api/v1/nodes/${tainted}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: JSON.stringify({ spec: { taints: [{ key: 'dedicated', value: 'batch', effect: 'NoSchedule' }] } }),
  });

  let avoids = await make(`sc-untainted-${suffix}`, {
    nodeSelector: { 'kubernetes.io/hostname': tainted },
  });
  check('an untolerated taint keeps the pod off the node', !avoids?.spec?.nodeName, avoids?.spec?.nodeName);
  check('the reason names the taint',
    `${conditionOf(avoids, 'PodScheduled')?.message}`.includes('untolerated taint'),
    conditionOf(avoids, 'PodScheduled')?.message);

  let tolerates = await make(`sc-tolerant-${suffix}`, {
    nodeSelector: { 'kubernetes.io/hostname': tainted },
    tolerations: [{ key: 'dedicated', operator: 'Equal', value: 'batch', effect: 'NoSchedule' }],
  });
  check('a matching toleration allows the node', tolerates?.spec?.nodeName === tainted, tolerates?.spec?.nodeName);

  await fetch(`${base}/api/v1/nodes/${tainted}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: JSON.stringify({ spec: { taints: [] } }),
  });

  // 7. Cordoning a node takes it out of consideration.
  let cordoned = simNodes[0].metadata.name;
  await fetch(`${base}/api/v1/nodes/${cordoned}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: JSON.stringify({ spec: { unschedulable: true } }),
  });
  let avoidCordoned = await make(`sc-cordon-${suffix}`, {
    nodeSelector: { 'kubernetes.io/hostname': cordoned },
  });
  check('a cordoned node is not scheduled to', !avoidCordoned?.spec?.nodeName, avoidCordoned?.spec?.nodeName);
  check('the reason is that the node is unschedulable',
    `${conditionOf(avoidCordoned, 'PodScheduled')?.message}`.includes('unschedulable'),
    conditionOf(avoidCordoned, 'PodScheduled')?.message);
  await fetch(`${base}/api/v1/nodes/${cordoned}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: JSON.stringify({ spec: { unschedulable: false } }),
  });

  // 8. Placement spreads rather than stacking everything on one node.
  let spread = [];
  for (let i = 0; i < 6; i++) {
    let name = `sc-spread-${i}-${suffix}`;
    spread.push(await make(name, {
      containers: [{
        name: 'c', image: 'busybox', command: ['sh', '-c', 'sleep 300'],
        resources: { requests: { cpu: '500m', memory: '256Mi' } },
      }],
    }));
  }
  let used = new Set(spread.map((p) => p?.spec?.nodeName).filter(Boolean));
  check('six pods land on more than one node', used.size > 1, [...used]);

  for (const name of created) {
    await req('DELETE', `${ns}/pods/${name}`);
  }

  console.log('---FAILS---');
  fails.forEach((f) => console.log(f));
  console.log(`\n${fails.length} fails, ${passes} passes.`);
  process.exit(fails.length ? 1 : 0);
})();
