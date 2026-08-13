// Wire matrix: for every wired resource, walk the content types a real client
// negotiates (JSON, YAML, protobuf, Table) and the patch types kubectl sends,
// then assert on the decoded response rather than the status code. Most of the
// failures this catches return 200 with the wrong body.
//
// Requires the server + mongo (same as boot-clean).
const protobuf = require('protobufjs');
const { resources } = require('./boot-clean.js');

const base = 'http://localhost:8080';

const protobufTypes = protobuf.loadSync([
  `${__dirname}/../proto/apps_v1_service.proto`,
  `${__dirname}/../proto/certificates_v1_service.proto`,
  `${__dirname}/../proto/core_v1_service.proto`,
  `${__dirname}/../proto/networking_v1_service.proto`,
  `${__dirname}/../proto/rbac_authorization_v1_service.proto`,
]);

// Create-only in real Kubernetes too, so there is nothing to GET by name.
const CREATE_ONLY = new Set(['Binding', 'SelfSubjectReview']);

const ACCEPT = {
  json: 'application/json',
  yaml: 'application/yaml',
  proto: 'application/vnd.kubernetes.protobuf',
  table: 'application/json;as=Table;v=v1;g=meta.k8s.io',
};

let fails = [];
let skipped = [];

async function req(method, path, { accept = ACCEPT.json, body, contentType = 'application/json' } = {}) {
  let headers = { Accept: accept };
  if (body !== undefined) {
    headers['Content-Type'] = contentType;
  }
  let res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
  });
  return { status: res.status, type: res.headers.get('content-type') || '', body: Buffer.from(await res.arrayBuffer()) };
}

function checkProtobuf(label, res, expectKind) {
  if (!res.type.includes('protobuf')) {
    // Only some API groups have a .proto here; the server falls back to JSON
    // for the rest, which is the documented behaviour rather than a failure.
    if (!protobufTypes.lookup(expectKind)) {
      skipped.push(`${label}: no .proto for ${expectKind}`);
      return;
    }
    fails.push(`${label}: protobuf requested, got ${res.type}`);
    return;
  }
  if (res.body.subarray(0, 4).toString('hex') !== '6b387300') {
    fails.push(`${label}: missing k8s magic prefix`);
    return;
  }
  let typeMeta, raw;
  try {
    ({ typeMeta, raw } = protobufTypes.lookup('Unknown').decode(res.body.subarray(4)));
  } catch (e) {
    fails.push(`${label}: Unknown envelope undecodable (${e.message})`);
    return;
  }
  if (typeMeta?.kind !== expectKind) {
    fails.push(`${label}: typeMeta.kind ${typeMeta?.kind || '(empty)'}, expected ${expectKind}`);
    return;
  }
  try {
    let decoded = protobufTypes.lookup(expectKind).decode(raw).toJSON();
    if (expectKind.endsWith('List') && !decoded.items?.length) {
      fails.push(`${label}: decoded list is empty`);
    }
  } catch (e) {
    fails.push(`${label}: payload undecodable as ${expectKind} (${e.message})`);
  }
}

function checkTable(label, res) {
  try {
    let table = JSON.parse(res.body.toString());
    if (table.kind !== 'Table') {
      fails.push(`${label}: kind ${table.kind}, expected Table`);
      return;
    }
    if (!Array.isArray(table.columnDefinitions) || !table.columnDefinitions.length) {
      fails.push(`${label}: table has no columnDefinitions`);
    }
  } catch (e) {
    fails.push(`${label}: table body is not JSON`);
  }
}

(async () => {
  for (const resource of resources) {
    let kind = resource.body.kind;
    let name = resource.body.metadata.name;
    let single = `${resource.path}/${name}`;

    let post = await req('POST', resource.path, { body: resource.body });
    if (post.status >= 400 && post.status !== 409) {
      fails.push(`POST ${resource.path}: ${post.status}`);
      continue;
    }

    // A second object of the same kind in the same namespace. The uniqueness
    // check used to ignore the name, so this 409'd against the first one.
    let second = `${name}-2`;
    let secondBody = { ...resource.body, metadata: { ...resource.body.metadata, name: second } };
    let post2 = await req('POST', resource.path, { body: secondBody });
    if (post2.status >= 400) {
      fails.push(`POST ${resource.path} (second object "${second}"): ${post2.status}`);
    } else {
      // uid is an identity, and the schema default was evaluated once at
      // module load — every object created in a process shared one uid, which
      // also collapsed the watch stream's dedupe key.
      try {
        let firstUid = JSON.parse(post.body.toString())?.metadata?.uid;
        let secondUid = JSON.parse(post2.body.toString())?.metadata?.uid;
        if (firstUid && firstUid === secondUid) {
          fails.push(`POST ${resource.path}: two objects share metadata.uid ${firstUid}`);
        }
      } catch (e) { /* non-JSON body is caught by the checks above */ }
      await req('DELETE', `${resource.path}/${second}`);
    }

    for (const [label, accept] of Object.entries(ACCEPT)) {
      if (CREATE_ONLY.has(kind)) {
        continue;
      }
      // `kubectl get <kind> -A` uses the cluster-wide collection path, which
      // for namespaced kinds was registered under /api/v1 or not at all.
      if (label === 'json' && resource.path.includes('/namespaces/')) {
        let clusterWide = resource.path.replace(/\/namespaces\/[^/]+/, '');
        let allNamespaces = await req('GET', clusterWide);
        if (allNamespaces.status !== 200) {
          fails.push(`LIST ${clusterWide} (all namespaces): ${allNamespaces.status}`);
        }
      }

      let list = await req('GET', resource.path, { accept });
      if (list.status !== 200) {
        fails.push(`LIST ${resource.path} (${label}): ${list.status}`);
      } else if (label === 'proto') {
        checkProtobuf(`LIST ${resource.path} (proto)`, list, `${kind}List`);
      } else if (label === 'table') {
        checkTable(`LIST ${resource.path} (table)`, list);
      } else if (label === 'yaml' && !list.type.includes('yaml')) {
        fails.push(`LIST ${resource.path} (yaml): got ${list.type}`);
      }

      if (CREATE_ONLY.has(kind)) {
        continue;
      }
      let one = await req('GET', single, { accept });
      if (one.status !== 200) {
        fails.push(`GET ${single} (${label}): ${one.status}`);
      } else if (label === 'proto') {
        checkProtobuf(`GET ${single} (proto)`, one, kind);
      } else if (label === 'table') {
        checkTable(`GET ${single} (table)`, one);
      } else if (label === 'yaml' && !one.type.includes('yaml')) {
        fails.push(`GET ${single} (yaml): got ${one.type}`);
      } else if (label === 'json') {
        // Mongoose's own bookkeeping is not part of the API object, and it
        // survives a `get -o yaml | apply` round trip if we serve it.
        let text = one.body.toString();
        if (text.includes('"_id"') || text.includes('"__v"')) {
          fails.push(`GET ${single} (json): response carries mongo internals`);
        }
      }
    }

    if (CREATE_ONLY.has(kind)) {
      continue;
    }

    // Every patch type kubectl can send. Each must preserve the identity
    // fields it doesn't mention — a patch that drops metadata.namespace makes
    // the object unreachable while still returning 200.
    let patches = [
      ['application/merge-patch+json', { metadata: { labels: { probe: 'merge' } } }],
      ['application/strategic-merge-patch+json', { metadata: { labels: { probe: 'strategic' } } }],
      ['application/json-patch+json', [{ op: 'add', path: '/metadata/labels', value: { probe: 'jsonpatch' } }]],
      ['application/apply-patch+yaml', `apiVersion: ${resource.body.apiVersion}\nkind: ${kind}\nmetadata:\n  name: ${name}\n  labels:\n    probe: apply\n`],
    ];
    for (const [contentType, body] of patches) {
      let patched = await req('PATCH', single, { body, contentType });
      if (patched.status >= 400) {
        fails.push(`PATCH ${single} (${contentType.split('/')[1]}): ${patched.status}`);
        continue;
      }
      let after = await req('GET', single);
      if (after.status !== 200) {
        fails.push(`PATCH ${single} (${contentType.split('/')[1]}): object unreachable afterwards (${after.status})`);
      }
    }

    // A dry run must not touch anything. This was ignored entirely: kubectl
    // printed "(server dry run)" and the object was created or deleted.
    let dryName = `${name}-dry`;
    let dryCreate = await req('POST', `${resource.path}?dryRun=All`, {
      body: { ...resource.body, metadata: { ...resource.body.metadata, name: dryName } },
    });
    if (dryCreate.status >= 400) {
      fails.push(`POST ${resource.path}?dryRun=All: ${dryCreate.status}`);
    } else {
      let shouldNotExist = await req('GET', `${resource.path}/${dryName}`);
      if (shouldNotExist.status !== 404) {
        fails.push(`POST ${resource.path}?dryRun=All: object was actually created`);
        await req('DELETE', `${resource.path}/${dryName}`);
      }
    }
    let dryDelete = await req('DELETE', `${single}?dryRun=All`);
    if (dryDelete.status < 400) {
      let shouldStillExist = await req('GET', single);
      if (shouldStillExist.status !== 200) {
        fails.push(`DELETE ${single}?dryRun=All: object was actually deleted`);
      }
    }

    let deleted = await req('DELETE', single, { accept: ACCEPT.proto });
    if (deleted.status >= 400) {
      fails.push(`DELETE ${single}: ${deleted.status}`);
    }

    // generateName: the server names the object. It used to store one with no
    // name at all, which nothing could fetch again.
    let generated = await req('POST', resource.path, {
      body: {
        ...resource.body,
        metadata: { ...resource.body.metadata, name: undefined, generateName: `${name}-gen-` },
      },
    });
    if (generated.status >= 400) {
      fails.push(`POST ${resource.path} (generateName): ${generated.status}`);
    } else {
      let generatedName;
      try {
        generatedName = JSON.parse(generated.body.toString())?.metadata?.name;
      } catch (e) {
        generatedName = undefined;
      }
      if (!generatedName || !generatedName.startsWith(`${name}-gen-`)) {
        fails.push(`POST ${resource.path} (generateName): server returned name ${JSON.stringify(generatedName)}`);
      } else {
        let refetch = await req('GET', `${resource.path}/${generatedName}`);
        if (refetch.status !== 200) {
          fails.push(`GET ${resource.path}/${generatedName} (generateName): ${refetch.status}`);
        }
        await req('DELETE', `${resource.path}/${generatedName}`);
      }
    }
  }

  console.log('---FAILS---');
  fails.forEach((f) => console.log(f));
  if (skipped.length) {
    console.log(`\n---SKIPPED (${skipped.length} protobuf checks, no .proto for that group)---`);
    console.log([...new Set(skipped.map((s) => s.split('no .proto for ')[1]))].sort().join(', '));
  }
  console.log(`\n${fails.length} fails, out of ${resources.length} resources tested.`);
  process.exit(fails.length ? 1 : 0);
})();
