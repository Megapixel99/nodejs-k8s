// The headline feature: a Deployment ends up with running pods. Everything
// here is about the chain Deployment -> ReplicationController -> Pod, which
// reported success at every step while producing nothing.
//
// Requires the server, mongo and a working docker.
const base = 'http://localhost:8080';
const deployments = '/apis/apps/v1/namespaces/default/deployments';
const pods = '/api/v1/namespaces/default/pods';

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

const deployment = (name, replicas) => ({
  apiVersion: 'apps/v1',
  kind: 'Deployment',
  metadata: { name, namespace: 'default' },
  spec: {
    replicas,
    selector: { matchLabels: { app: name } },
    template: {
      metadata: { name, labels: { app: name } },
      spec: { containers: [{ name: 'c', image: 'busybox', command: ['sh', '-c', 'sleep 60'] }] },
    },
  },
});

const mine = (list, name) => (list.body?.items || []).filter((i) => `${i.metadata?.name}`.startsWith(name));

(async () => {
  let reachable = await fetch(`${base}/api`).then(() => true).catch(() => false);
  if (!reachable) {
    console.log(`nothing listening on ${base}; start the server first`);
    process.exit(1);
  }

  let name = `wl-${Date.now().toString(36)}`;
  let created = await req('POST', deployments, deployment(name, 2));
  check('deployment is created', created.status === 201, created.status);
  check('spec.selector survives the round trip', created.body?.spec?.selector?.matchLabels?.app === name, created.body?.spec?.selector);
  check('strategy is defaulted', created.body?.spec?.strategy?.type === 'RollingUpdate', created.body?.spec?.strategy);

  // Containers start in the background; give the controller a moment.
  await new Promise((resolve) => setTimeout(resolve, 9000));

  let fetched = await req('GET', `${deployments}/${name}`);
  check('the deployment is still there afterwards', fetched.status === 200, fetched.status);
  check('metadata survived the controller writes', fetched.body?.metadata?.name === name, fetched.body?.metadata);
  check('status counts the replicas', fetched.body?.status?.replicas === 2, fetched.body?.status);
  check('status is never negative', (fetched.body?.status?.replicas ?? 0) >= 0, fetched.body?.status);

  let podList = await req('GET', pods);
  let ours = mine(podList, name);
  check('one pod per replica', ours.length === 2, ours.map((p) => p.metadata.name));
  check('pods have distinct names', new Set(ours.map((p) => p.metadata.name)).size === ours.length, ours.map((p) => p.metadata.name));
  check('pods are running', ours.every((p) => ['Running', 'Succeeded'].includes(p.status?.phase)), ours.map((p) => p.status?.phase));

  let table = await fetch(`${base}${deployments}`, { headers: { Accept: 'application/json;as=Table;v=v1;g=meta.k8s.io' } });
  check('the deployment table renders', table.status === 200, table.status);

  let scale = await req('PUT', `${deployments}/${name}/scale`, {
    apiVersion: 'autoscaling/v1',
    kind: 'Scale',
    metadata: { name, namespace: 'default' },
    spec: { replicas: 1 },
  });
  check('scale subresource accepts a write', scale.status === 200, scale.status);
  check('scale reports the new count', scale.body?.spec?.replicas === 1, scale.body?.spec);

  // Deleting the deployment must take its pods with it. The cleanup used to
  // bail out on a stale in-memory replica count, and the pod lookup passed its
  // options into find()'s projection slot, so the pods (and their containers)
  // were left running.
  await req('DELETE', `${deployments}/${name}`);
  await new Promise((resolve) => setTimeout(resolve, 4000));
  let leftovers = mine(await req('GET', pods), name);
  check('deleting the deployment deletes its pods', leftovers.length === 0, leftovers.map((p) => p.metadata.name));
  for (const pod of leftovers) {
    await req('DELETE', `${pods}/${pod.metadata.name}`);
  }

  console.log('---FAILS---');
  fails.forEach((f) => console.log(f));
  console.log(`\n${fails.length} fails, ${passes} passes.`);
  process.exit(fails.length ? 1 : 0);
})();
