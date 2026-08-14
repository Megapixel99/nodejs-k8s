// The pod features the README advertises: env from ConfigMaps and Secrets,
// ConfigMap volume mounts, and reading logs. Each of these failed while the
// API answered 201 — the pod was accepted and then quietly went to Failed, or
// the container started without the data it was supposed to have.
//
// Requires the server, mongo and a working docker.
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

const logsOf = (name) => fetch(`${base}${ns}/pods/${name}/log`).then((r) => r.text());
const settle = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  let reachable = await fetch(`${base}/api`).then(() => true).catch(() => false);
  if (!reachable) {
    console.log(`nothing listening on ${base}; start the server first`);
    process.exit(1);
  }

  let suffix = Date.now().toString(36);
  let cm = `pf-cm-${suffix}`;
  let secret = `pf-sec-${suffix}`;
  let pods = [`pf-env-${suffix}`, `pf-vol-${suffix}`];

  await req('POST', `${ns}/configmaps`, {
    apiVersion: 'v1', kind: 'ConfigMap',
    metadata: { name: cm, namespace: 'default' },
    data: { GREETING: 'hello-from-cm' },
  });
  // stringData is write-only: the server base64s it into data and drops it.
  let madeSecret = await req('POST', `${ns}/secrets`, {
    apiVersion: 'v1', kind: 'Secret',
    metadata: { name: secret, namespace: 'default' },
    type: 'Opaque',
    stringData: { TOKEN: 's3cr3t' },
  });
  check('stringData is converted into data', madeSecret.body?.data?.TOKEN === Buffer.from('s3cr3t').toString('base64'), madeSecret.body?.data);
  check('stringData is not stored', madeSecret.body?.stringData === undefined, madeSecret.body?.stringData);

  // envFrom with only a configMapRef used to look up Secret "undefined",
  // fail the container start, and leave the pod in Failed.
  await req('POST', `${ns}/pods`, {
    apiVersion: 'v1', kind: 'Pod',
    metadata: { name: pods[0], namespace: 'default' },
    spec: {
      restartPolicy: 'Never',
      containers: [{
        name: 'c', image: 'busybox',
        command: ['sh', '-c', 'echo "$GREETING/$TOKEN"'],
        envFrom: [{ configMapRef: { name: cm } }, { secretRef: { name: secret } }],
      }],
    },
  });

  await req('POST', `${ns}/pods`, {
    apiVersion: 'v1', kind: 'Pod',
    metadata: { name: pods[1], namespace: 'default' },
    spec: {
      restartPolicy: 'Never',
      volumes: [{ name: 'cfg', configMap: { name: cm } }],
      containers: [{
        name: 'c', image: 'busybox',
        command: ['sh', '-c', 'cat /etc/cfg/GREETING'],
        volumeMounts: [{ name: 'cfg', mountPath: '/etc/cfg' }],
      }],
    },
  });

  await settle(9000);

  let envPod = await req('GET', `${ns}/pods/${pods[0]}`);
  check('a pod using envFrom does not fail to start', envPod.body?.status?.phase !== 'Failed', envPod.body?.status);
  let envLogs = await logsOf(pods[0]);
  check('ConfigMap values reach the container', envLogs.includes('hello-from-cm'), envLogs.trim().slice(0, 60));
  check('Secret values reach the container', envLogs.includes('s3cr3t'), envLogs.trim().slice(0, 60));
  // The log endpoint defaults to the only container; requiring ?container=
  // answered 404 "pod not found".
  check('logs are readable without naming the container', envLogs.trim().length > 0, envLogs.trim().length);

  let volPod = await req('GET', `${ns}/pods/${pods[1]}`);
  check('the volume source survives the round trip', volPod.body?.spec?.volumes?.[0]?.configMap?.name === cm, volPod.body?.spec?.volumes?.[0]);
  let volLogs = await logsOf(pods[1]);
  check('a ConfigMap volume is mounted into the container', volLogs.includes('hello-from-cm'), volLogs.trim().slice(0, 60));

  for (const pod of pods) {
    await req('DELETE', `${ns}/pods/${pod}`);
  }
  await req('DELETE', `${ns}/configmaps/${cm}`);
  await req('DELETE', `${ns}/secrets/${secret}`);

  console.log('---FAILS---');
  fails.forEach((f) => console.log(f));
  console.log(`\n${fails.length} fails, ${passes} passes.`);
  process.exit(fails.length ? 1 : 0);
})();
