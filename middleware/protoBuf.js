const K8Object = require('../objects/object.js');

// Recursively convert decoded Time values ({seconds, nanos}) and Quantity
// values ({string: "..."}) back to the JSON scalars Mongoose / our JSON
// handlers expect. Protobuf decoding surfaces them as objects but the schema
// (and the test client) round-trips them as strings.
// proto3 has no concept of an absent scalar: every field a client left unset
// decodes as its zero value, so a Pod created by client-go arrives carrying
// `metadata.uid: ""`, `status.phase: ""`, `spec.schedulerName: ""` and dozens
// more. Those look like values, which means the schema's defaults never fire --
// so a protobuf-created pod got no uid, and every write keyed on uid (its
// phase, its conditions) went nowhere, and the scheduler skipped it for having
// no identity. A pod that JSON clients got right sat inert for client-go ones.
//
// Empty strings are dropped so the defaults apply. Empty arrays are kept: on an
// update, `[]` is how a client clears a list, and that is a real instruction.
function stripProtoZeroStrings(v) {
  if (Array.isArray(v)) {
    return v.map(stripProtoZeroStrings);
  }
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    let out = {};
    for (const [key, value] of Object.entries(v)) {
      if (value === '') {
        continue;
      }
      out[key] = stripProtoZeroStrings(value);
    }
    return out;
  }
  return v;
}

function normalizeDecoded(v) {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return v.map(normalizeDecoded);
  if (typeof v === 'object') {
    let keys = Object.keys(v);
    // protobufjs Long = {low, high, unsigned}
    if (keys.length === 3 && 'low' in v && 'high' in v && 'unsigned' in v) {
      return v.high * 0x100000000 + (v.low >>> 0);
    }
    // k8s IntOrString = {type: 0|1, intVal, strVal}
    if (('intVal' in v || 'strVal' in v) && 'type' in v && keys.every((k) => ['type', 'intVal', 'strVal'].includes(k))) {
      return v.type === 1 ? (v.strVal || '') : Number(normalizeDecoded(v.intVal) || 0);
    }
    // protobuf Time = {seconds, nanos}
    if (keys.length <= 2 && ('seconds' in v || 'nanos' in v)) {
      let secondsN = typeof v.seconds === 'object' ? normalizeDecoded(v.seconds) : Number(v.seconds || 0);
      let nanosN = typeof v.nanos === 'object' ? normalizeDecoded(v.nanos) : Number(v.nanos || 0);
      let ms = secondsN * 1000 + Math.floor(nanosN / 1e6);
      try { return new Date(ms).toISOString().replace(/\.\d{0,3}Z$/, 'Z'); } catch (e) { return undefined; }
    }
    // protobuf Quantity = {string}
    if (keys.length === 1 && keys[0] === 'string') return v.string;
    let out = {};
    for (const k of keys) out[k] = normalizeDecoded(v[k]);
    return out;
  }
  return v;
}

// Keys whose children are Quantity-valued maps (`{cpu: "100m"}` style).
// Strings under these keys must be wrapped as Quantity proto messages
// (`{string: "100m"}`) or the Go client decodes them as zero.
const QUANTITY_MAP_KEYS = new Set([
  'limits', 'requests', 'min', 'max', 'default', 'defaultRequest',
  'maxLimitRequestRatio', 'capacity', 'allocatable', 'hard', 'used',
]);

// Convert ISO date strings back to protobuf Time / MicroTime structs,
// and plain quantity strings back to Quantity messages, for outbound encoding.
function prepareForProto(v, parentKey) {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return v.map((e) => prepareForProto(e, parentKey));
  if (typeof v === 'object') {
    let out = {};
    for (const k of Object.keys(v)) {
      let child = v[k];
      if (typeof child === 'string' && /Time(?:stamp)?$/i.test(k) && /^\d{4}-\d{2}-\d{2}T/.test(child)) {
        let ms = Date.parse(child);
        if (!Number.isNaN(ms)) {
          out[k] = { seconds: Math.floor(ms / 1000), nanos: (ms % 1000) * 1e6 };
          continue;
        }
      }
      // If this object itself is a Quantity map (cpu/memory/storage → value),
      // wrap each string value as a Quantity proto message.
      if (QUANTITY_MAP_KEYS.has(parentKey) && typeof child === 'string') {
        out[k] = { string: child };
        continue;
      }
      out[k] = prepareForProto(child, k);
    }
    return out;
  }
  return v;
}

module.exports = {
  normalizeDecoded,
  fromProtoBuf: (data, operationId, protobufTypes) => {
    let b = data.subarray(4, data.length);
    let unknownType = protobufTypes.lookup("Unknown");
    let { typeMeta, raw } = unknownType.decode(b);
    let dataType = protobufTypes.lookup(operationId);
    let dataInfo = dataType.decode(raw);
    data = stripProtoZeroStrings(normalizeDecoded({ ...typeMeta, ...dataInfo }));
    return data;
  },
  prepareForProto,
  toProtoBuf: (data, operationId, protobufTypes) => {
    // A list arrives either as a bare array or, from `K8Object.list`, as a
    // `{kind: 'XList', items: [...]}` envelope. Testing only for Array meant
    // the envelope took the singular branch and encoded as a single object,
    // silently dropping every item.
    let isList = Array.isArray(data)
      || (Array.isArray(data?.items) && `${data?.kind}`.endsWith('List'));
    if (Array.isArray(data)) {
      // Wrap so the List message's `items` field is actually populated, and so
      // the Unknown envelope still gets a typeMeta clients can route on.
      data = {
        apiVersion: data[0]?.apiVersion,
        kind: data[0]?.kind ? `${data[0].kind}List` : undefined,
        items: data,
      };
    }
    if (isList && !operationId.includes('List')) {
      operationId = `${operationId}List`;
    } else if (!isList && operationId.includes('List')) {
      operationId = operationId.substring(0, operationId.length - 4);
    }
    let dataType = protobufTypes.lookup(operationId);
    data = prepareForProto(data);
    let dataInfo = dataType.encode(data).finish();
    let unknownType = protobufTypes.lookup("Unknown");
    let obj = {
      typeMeta: {
        kind: (data.kind ?? ''),
        apiVersion: (data.apiVersion ?? ''),
      },
      raw: dataInfo,
      contentEncoding: '',
      contentType: '',
    };
    let encoded = unknownType.encode(obj).finish();
    let prefix = Buffer.from([107, 56, 115, 0]);
    return Buffer.concat([prefix, encoded]);
  },
  toWatchEvent: (buffer, eventType, protobufTypes) => {
    let watchEventType = protobufTypes.lookup('WatchEvent');
    let obj = {
      type: eventType,
      object: {
        raw: buffer
      },
    }
    // A watch frame is NOT an object on the wire. Kubernetes negotiates a
    // separate stream serializer for watches -- length-delimited framing plus
    // a *raw* protobuf serializer -- so each frame holds a bare WatchEvent
    // message with no magic prefix and no Unknown envelope. Wrapping it like
    // an ordinary object put `k8s\0` at the front of the frame, and client-go
    // read those four bytes as the start of a WatchEvent and gave up:
    //
    //   unable to decode an event from the watch stream:
    //   proto: WatchEvent: wiretype end group for non-group
    //
    // The object *inside* the event keeps the full encoding: `object` is a
    // RawExtension, and its bytes are what the client hands to the object
    // decoder, prefix and all.
    let message = watchEventType.encode(obj).finish();
    // Protobuf messages aren't self-delimiting, so a stream of them can't be
    // split back apart. Each frame is length-delimited with a 4-byte
    // big-endian prefix; without it the second event in a watch is
    // unreadable, and so is the first if the client waits for a boundary.
    let length = Buffer.alloc(4);
    length.writeUInt32BE(message.length, 0);
    return Buffer.concat([length, Buffer.from(message)]);
  }
};
