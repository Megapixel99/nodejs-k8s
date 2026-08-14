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
  let volume = volPod.body?.spec?.volumes?.[0] || {};
  check('the volume source survives the round trip', volume.configMap?.name === cm, volume);
  // Declaring the sources by spreading the volume schema made every volume
  // carry ten empty source objects the client never set.
  check('the volume carries only the source that was set',
    Object.keys(volume).sort().join(',') === 'configMap,name', Object.keys(volume));
  let volLogs = await logsOf(pods[1]);
  check('a ConfigMap volume is mounted into the container', volLogs.includes('hello-from-cm'), volLogs.trim().slice(0, 60));

  // A merge patch arrives flattened to dot-paths, so `stringData.X` has to be
  // folded too — matching only the whole-object form left the plaintext stored.
  await req('PATCH', `${ns}/secrets/${secret}`, undefined);
  let patched = await fetch(`${base}${ns}/secrets/${secret}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: JSON.stringify({ stringData: { EXTRA: 'added' } }),
  }).then((r) => r.json());
  check('a patched stringData is converted too', patched?.data?.EXTRA === Buffer.from('added').toString('base64'), patched?.data);
  check('a patched stringData is not stored', patched?.stringData === undefined, patched?.stringData);

  // Readiness probes: the result used to be computed and discarded, and the
  // exec command was joined into a shell string that re-parsed its own
  // quoting, so `['sh','-c','exit 1']` ran as a no-op and passed.
  let failing = `pf-notready-${suffix}`;
  let passing = `pf-ready-${suffix}`;
  let probe = (name, code) => ({
    apiVersion: 'v1', kind: 'Pod',
    metadata: { name, namespace: 'default' },
    spec: {
      containers: [{
        name: 'c', image: 'busybox', command: ['sh', '-c', 'sleep 40'],
        readinessProbe: { exec: { command: ['sh', '-c', `exit ${code}`] }, periodSeconds: 1, failureThreshold: 1 },
      }],
    },
  });
  await req('POST', `${ns}/pods`, probe(failing, 1));
  await req('POST', `${ns}/pods`, probe(passing, 0));
  await settle(11000);

  let notReady = await req('GET', `${ns}/pods/${failing}`);
  check('a failing readiness probe leaves the container not ready',
    notReady.body?.status?.containerStatuses?.[0]?.ready === false,
    notReady.body?.status?.containerStatuses?.[0]);
  check('a failing readiness probe leaves the pod not Ready',
    (notReady.body?.status?.conditions || []).find((c) => c.type === 'Ready')?.status === 'False',
    (notReady.body?.status?.conditions || []).map((c) => `${c.type}=${c.status}`));

  let ready = await req('GET', `${ns}/pods/${passing}`);
  check('a passing readiness probe keeps the container ready',
    ready.body?.status?.containerStatuses?.[0]?.ready === true,
    ready.body?.status?.containerStatuses?.[0]);

  // httpGet and tcpSocket were nested under `exec` in the schema, so a probe
  // declaring one had it dropped on save and could never run.
  let httpProbe = `pf-http-${suffix}`;
  await req('POST', `${ns}/pods`, {
    apiVersion: 'v1', kind: 'Pod',
    metadata: { name: httpProbe, namespace: 'default' },
    spec: {
      containers: [{
        name: 'c', image: 'busybox', command: ['sh', '-c', 'sleep 40'],
        readinessProbe: { httpGet: { path: '/', port: 9999 }, periodSeconds: 1, failureThreshold: 1 },
      }],
    },
  });
  await settle(11000);
  let http = await req('GET', `${ns}/pods/${httpProbe}`);
  check('an httpGet probe survives the round trip', http.body?.spec?.containers?.[0]?.readinessProbe?.httpGet?.port === 9999, http.body?.spec?.containers?.[0]?.readinessProbe);
  check('an httpGet probe against a dead port is not ready', http.body?.status?.containerStatuses?.[0]?.ready === false, http.body?.status?.containerStatuses?.[0]);
  // A probe should not report a handler it never declared.
  check('a probe carries only its own handler',
    http.body?.spec?.containers?.[0]?.readinessProbe?.exec === undefined,
    http.body?.spec?.containers?.[0]?.readinessProbe?.exec);

  // Readiness is written on transition, not on every tick — otherwise every
  // watcher gets a MODIFIED event per probe period for an unchanged status.
  let first = await req('GET', `${ns}/pods/${failing}`);
  await settle(4000);
  let second = await req('GET', `${ns}/pods/${failing}`);
  check('a settled readiness state stops rewriting the object',
    first.body?.metadata?.resourceVersion === second.body?.metadata?.resourceVersion,
    [first.body?.metadata?.resourceVersion, second.body?.metadata?.resourceVersion]);
  await req('DELETE', `${ns}/pods/${httpProbe}`);

  for (const pod of [...pods, failing, passing]) {
    await req('DELETE', `${ns}/pods/${pod}`);
  }
  await req('DELETE', `${ns}/configmaps/${cm}`);
  await req('DELETE', `${ns}/secrets/${secret}`);

  console.log('---FAILS---');
  fails.forEach((f) => console.log(f));
  console.log(`\n${fails.length} fails, ${passes} passes.`);
  process.exit(fails.length ? 1 : 0);
})();
