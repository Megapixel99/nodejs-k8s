// Protobuf round-trip test. Encoding is the layer where a wrong value doesn't
// throw: an unknown field name is skipped, a Quantity sent as a plain string
// decodes as zero, and a list encoded with the singular message decodes as an
// empty list. All three report success. So assert on what a client would
// actually decode, not on whether encode() returned.
//
// Runs offline against the encoder. If a server is up on :8080 it also checks
// the bytes on the wire.
const protobuf = require('protobufjs');
const { toProtoBuf } = require('../middleware/protoBuf.js');

const base = 'http://localhost:8080';

const protobufTypes = protobuf.loadSync([
  `${__dirname}/../proto/apps_v1_service.proto`,
  `${__dirname}/../proto/certificates_v1_service.proto`,
  `${__dirname}/../proto/core_v1_service.proto`,
  `${__dirname}/../proto/networking_v1_service.proto`,
  `${__dirname}/../proto/rbac_authorization_v1_service.proto`,
]);

let fails = [];
let passes = 0;

function check(name, condition, got) {
  if (condition) {
    passes++;
    return;
  }
  fails.push(`${name} -> got ${JSON.stringify(got)}`);
}

// Decode the way a Go client does: skip the 4-byte magic, unwrap Unknown, then
// decode `raw` with the type named in typeMeta.
function decode(buf, type) {
  if (buf.subarray(0, 4).toString('hex') !== '6b387300') {
    throw new Error(`missing k8s magic prefix, got ${buf.subarray(0, 4).toString('hex')}`);
  }
  let { typeMeta, raw } = protobufTypes.lookup('Unknown').decode(buf.subarray(4));
  return { typeMeta, object: protobufTypes.lookup(type).decode(raw).toJSON() };
}

const objRef = { kind: 'Pod', namespace: 'default', name: 'demo', uid: 'abc-123', apiVersion: 'v1' };
const iso = '2026-08-13T10:00:00Z';

// Events are stored with events.k8s.io/v1 field names but served on /api/v1,
// whose proto only knows the core/v1 names. objects/event.js fills in the
// core/v1 side; without it every one of these fields encodes as absent.
const event = {
  apiVersion: 'v1',
  kind: 'Event',
  metadata: { name: 'demo.evt1', namespace: 'default', creationTimestamp: iso },
  reason: 'Scheduled',
  type: 'Normal',
  note: 'Successfully assigned default/demo to node-1',
  regarding: objRef,
  reportingController: 'kubelet',
  deprecatedSource: { component: 'kubelet', host: 'node-1' },
  deprecatedFirstTimestamp: iso,
  deprecatedLastTimestamp: iso,
  deprecatedCount: 3,
  series: { count: 2, lastObservedTime: '2026-08-13T10:05:00Z' },
  involvedObject: objRef,
  message: 'Successfully assigned default/demo to node-1',
  source: { component: 'kubelet', host: 'node-1' },
  firstTimestamp: iso,
  lastTimestamp: iso,
  eventTime: iso,
  count: 3,
  reportingComponent: 'kubelet',
};

function testEvent() {
  let { typeMeta, object } = decode(toProtoBuf(event, 'Event', protobufTypes), 'Event');
  check('Event: typeMeta routes to Event', typeMeta.kind === 'Event', typeMeta);
  check('Event: message survives', object.message === event.message, object.message);
  check('Event: involvedObject survives', object.involvedObject?.name === 'demo', object.involvedObject);
  check('Event: source survives', object.source?.component === 'kubelet', object.source);
  check('Event: count survives', object.count === 3, object.count);
  check('Event: firstTimestamp is a Time struct', !!object.firstTimestamp?.seconds, object.firstTimestamp);
  check('Event: eventTime is a MicroTime struct', !!object.eventTime?.seconds, object.eventTime);
  check('Event: series.lastObservedTime is a MicroTime struct', !!object.series?.lastObservedTime?.seconds, object.series);
}

function testEventList() {
  let envelope = {
    apiVersion: 'v1',
    kind: 'EventList',
    metadata: { resourceVersion: '1' },
    items: [event, { ...event, metadata: { ...event.metadata, name: 'demo.evt2' } }],
  };
  let { typeMeta, object } = decode(toProtoBuf(envelope, 'EventList', protobufTypes), 'EventList');
  check('EventList: typeMeta routes to EventList', typeMeta.kind === 'EventList', typeMeta);
  check('EventList: both items survive', object.items?.length === 2, object.items?.length);
  check('EventList: item content survives', object.items?.[0]?.message === event.message, object.items?.[0]?.message);
}

function testBareArrayList() {
  let pods = [{
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: { name: 'p1', namespace: 'default' },
    spec: { containers: [{ name: 'c', image: 'nginx', resources: { limits: { cpu: '100m', memory: '512Mi' } } }] },
  }];
  let { typeMeta, object } = decode(toProtoBuf(pods, 'PodList', protobufTypes), 'PodList');
  check('PodList: typeMeta routes to PodList', typeMeta.kind === 'PodList', typeMeta);
  check('PodList: item survives', object.items?.length === 1, object.items?.length);
  let limits = object.items?.[0]?.spec?.containers?.[0]?.resources?.limits;
  check('PodList: cpu is a Quantity, not zero', limits?.cpu?.string === '100m', limits?.cpu);
  check('PodList: memory is a Quantity, not zero', limits?.memory?.string === '512Mi', limits?.memory);
}

async function testWire() {
  let reachable = await fetch(`${base}/api`).then(() => true).catch(() => false);
  if (!reachable) {
    console.log(`(skipping wire checks; nothing listening on ${base})`);
    return;
  }
  let get = async (path) => {
    let res = await fetch(`${base}${path}`, { headers: { Accept: 'application/vnd.kubernetes.protobuf' } });
    return { status: res.status, type: res.headers.get('content-type'), body: Buffer.from(await res.arrayBuffer()) };
  };

  let list = await get('/api/v1/namespaces/default/events');
  check('wire: list is protobuf', `${list.type}`.includes('protobuf'), list.type);
  if (`${list.type}`.includes('protobuf')) {
    let { typeMeta } = decode(list.body, 'EventList');
    check('wire: list typeMeta routes to EventList', typeMeta.kind === 'EventList', typeMeta);
  }

  // A 404 body is a Status; encoding it with the route's own type would hand
  // the client a Pod-shaped decode of Status bytes.
  let missing = await get('/api/v1/namespaces/default/pods/definitely-not-here');
  check('wire: 404 status code', missing.status === 404, missing.status);
  check('wire: 404 is protobuf', `${missing.type}`.includes('protobuf'), missing.type);
  if (`${missing.type}`.includes('protobuf')) {
    let { typeMeta, object } = decode(missing.body, 'Status');
    check('wire: 404 typeMeta routes to Status', typeMeta.kind === 'Status', typeMeta);
    check('wire: 404 names the resource', object.message === 'pod "definitely-not-here" not found', object.message);
  }
}

// A protobuf watch is a stream of length-delimited frames. Without the 4-byte
// prefix the messages run together and can't be split back apart, so assert on
// framing and on decoding the nested object, not just on bytes arriving.
async function testWatchFraming() {
  let reachable = await fetch(`${base}/api`).then(() => true).catch(() => false);
  if (!reachable) {
    return;
  }
  let name = 'proto-watch-probe';
  await fetch(`${base}/api/v1/namespaces/default/configmaps/${name}`, { method: 'DELETE' });

  let controller = new AbortController();
  let res = await fetch(`${base}/api/v1/namespaces/default/configmaps?watch=true`, {
    headers: { Accept: 'application/vnd.kubernetes.protobuf' },
    signal: controller.signal,
  });
  check('watch: content-type marks a watch stream', `${res.headers.get('content-type')}`.includes('stream=watch'), res.headers.get('content-type'));

  setTimeout(() => {
    fetch(`${base}/api/v1/namespaces/default/configmaps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiVersion: 'v1', kind: 'ConfigMap', metadata: { name, namespace: 'default' }, data: { a: 'b' } }),
    }).catch(() => {});
  }, 300);
  let stop = setTimeout(() => controller.abort(), 4000);

  let reader = res.body.getReader();
  let buffer = Buffer.alloc(0);
  let frames = [];
  try {
    while (frames.length < 1) {
      let { value, done } = await reader.read();
      if (done) break;
      buffer = Buffer.concat([buffer, Buffer.from(value)]);
      while (buffer.length >= 4) {
        let length = buffer.readUInt32BE(0);
        if (buffer.length < 4 + length) break;
        frames.push(buffer.subarray(4, 4 + length));
        buffer = buffer.subarray(4 + length);
      }
    }
  } catch (e) {
    if (e.name !== 'AbortError') throw e;
  }
  clearTimeout(stop);
  controller.abort();

  if (!frames.length) {
    fails.push('watch: no complete frame decoded from the protobuf stream');
    return;
  }
  let outer = decode(frames[0], 'WatchEvent');
  check('watch: frame is a WatchEvent', outer.typeMeta.kind === 'WatchEvent', outer.typeMeta);
  check('watch: event type is set', typeof outer.object.type === 'string' && outer.object.type.length > 0, outer.object.type);
  let inner = decode(Buffer.from(outer.object.object.raw, 'base64'), 'ConfigMap');
  check('watch: nested object decodes', inner.object?.metadata?.name?.length > 0, inner.object?.metadata);
}

(async () => {
  testEvent();
  testEventList();
  testBareArrayList();
  await testWire();
  await testWatchFraming();

  console.log('---FAILS---');
  fails.forEach((f) => console.log(f));
  console.log(`\n${fails.length} fails, ${passes} passes.`);
  process.exit(fails.length ? 1 : 0);
})();
