// resourceVersion semantics. The value is opaque to clients, but they compare
// it, resume watches from it and write it back for optimistic concurrency — so
// the failures here are all "the server answered 200 and the client is now
// wrong": a duplicate replay, a lost update, a version that means nothing.
//
// Requires the server + mongo.
const base = 'http://localhost:8080';
const path = '/api/v1/namespaces/default/configmaps';

let fails = [];
let passes = 0;

function check(name, condition, got) {
  if (condition) {
    passes++;
    return;
  }
  fails.push(`${name} -> got ${JSON.stringify(got)}`);
}

async function req(method, url, body, contentType = 'application/json') {
  let res = await fetch(`${base}${url}`, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': contentType },
    body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
  });
  let text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch (e) {
    return { status: res.status, body: text };
  }
}

const configMap = (name, data = { k: 'v' }) => ({
  apiVersion: 'v1',
  kind: 'ConfigMap',
  metadata: { name, namespace: 'default' },
  data,
});
const version = (obj) => obj?.metadata?.resourceVersion;

// Collect watch events for `ms`, optionally doing something once the stream is
// open. Resolves on a timer rather than on stream end — a watch never ends.
function watch(query, ms, during) {
  return new Promise(async (resolve) => {
    let controller = new AbortController();
    let events = [];
    let res;
    try {
      res = await fetch(`${base}${path}?watch=true${query}`, { signal: controller.signal });
    } catch (e) {
      return resolve(events);
    }
    let reader = res.body.getReader();
    let buffer = '';
    (async () => {
      try {
        while (true) {
          let { value, done } = await reader.read();
          if (done) break;
          buffer += Buffer.from(value).toString();
          let index;
          while ((index = buffer.indexOf('\n')) >= 0) {
            let line = buffer.slice(0, index);
            buffer = buffer.slice(index + 1);
            if (!line.trim()) continue;
            try {
              let event = JSON.parse(line);
              events.push({ type: event.type, name: event.object?.metadata?.name, version: version(event.object) });
            } catch (e) { /* partial frame */ }
          }
        }
      } catch (e) { /* aborted */ }
    })();
    if (during) setTimeout(() => { during(); }, 300);
    setTimeout(() => { controller.abort(); resolve(events); }, ms);
  });
}

(async () => {
  let reachable = await fetch(`${base}/api`).then(() => true).catch(() => false);
  if (!reachable) {
    console.log(`nothing listening on ${base}; start the server first`);
    process.exit(1);
  }

  let names = ['rv-one', 'rv-two', 'rv-watch'];
  for (const name of names) {
    await req('DELETE', `${path}/${name}`);
  }

  let first = await req('POST', path, configMap('rv-one'));
  let second = await req('POST', path, configMap('rv-two'));
  check('create allocates a numeric version', /^\d+$/.test(version(first.body)), version(first.body));
  check('versions increase across objects', Number(version(second.body)) > Number(version(first.body)),
    [version(first.body), version(second.body)]);

  let readA = await req('GET', `${path}/rv-one`);
  let readB = await req('GET', `${path}/rv-one`);
  check('a read does not change the version', version(readA.body) === version(first.body) && version(readB.body) === version(first.body),
    [version(first.body), version(readA.body), version(readB.body)]);

  let patched = await req('PATCH', `${path}/rv-one`, { metadata: { labels: { touched: 'yes' } } }, 'application/merge-patch+json');
  check('a patch bumps the version', Number(version(patched.body)) > Number(version(first.body)),
    [version(first.body), version(patched.body)]);

  let list = await req('GET', path);
  check('list reports the cluster version, not a content hash',
    Number(version(list.body)) >= Number(version(patched.body)), version(list.body));

  // Optimistic concurrency: the version the client holds is now stale.
  let stale = await req('PUT', `${path}/rv-one`, {
    ...configMap('rv-one', { k: 'stale' }),
    metadata: { name: 'rv-one', namespace: 'default', resourceVersion: version(first.body) },
  });
  check('a write at a stale version conflicts', stale.status === 409, stale.status);
  check('the conflict body is a Status', stale.body?.reason === 'Conflict', stale.body?.reason);

  let current = await req('GET', `${path}/rv-one`);
  let fresh = await req('PUT', `${path}/rv-one`, {
    ...configMap('rv-one', { k: 'fresh' }),
    metadata: { name: 'rv-one', namespace: 'default', resourceVersion: version(current.body) },
  });
  check('a write at the current version succeeds', fresh.status === 200, fresh.status);
  check('the write applied', fresh.body?.data?.k === 'fresh', fresh.body?.data);

  let unversioned = await req('PUT', `${path}/rv-one`, configMap('rv-one', { k: 'unversioned' }));
  check('a write with no version is still accepted', unversioned.status === 200, unversioned.status);

  // The informer sequence: list, then watch from what the list reported. The
  // objects the list already returned must not come back as ADDED.
  let listed = await req('GET', path);
  let listedVersion = version(listed.body);
  let resumed = await watch(`&resourceVersion=${listedVersion}`, 1400, () => {
    req('POST', path, configMap('rv-watch'));
  });
  check('watch from the list version replays nothing',
    resumed.every((e) => e.name !== 'rv-one' && e.name !== 'rv-two'), resumed);
  check('watch from the list version delivers later changes',
    resumed.some((e) => e.type === 'ADDED' && e.name === 'rv-watch'), resumed);

  let full = await watch('', 800);
  check('watch with no version sends current state',
    full.some((e) => e.name === 'rv-one') && full.some((e) => e.name === 'rv-two'), full.length);

  let zero = await watch('&resourceVersion=0', 800);
  check('watch at version 0 sends current state', zero.some((e) => e.name === 'rv-one'), zero.length);

  for (const name of names) {
    await req('DELETE', `${path}/${name}`);
  }

  console.log('---FAILS---');
  fails.forEach((f) => console.log(f));
  console.log(`\n${fails.length} fails, ${passes} passes.`);
  process.exit(fails.length ? 1 : 0);
})();
