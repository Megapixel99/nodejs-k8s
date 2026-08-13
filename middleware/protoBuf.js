const K8Object = require('../objects/object.js');

// Recursively convert decoded Time values ({seconds, nanos}) and Quantity
// values ({string: "..."}) back to the JSON scalars Mongoose / our JSON
// handlers expect. Protobuf decoding surfaces them as objects but the schema
// (and the test client) round-trips them as strings.
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
    data = normalizeDecoded({ ...typeMeta, ...dataInfo });
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
    let encoded = watchEventType.encode(obj).finish();
    // let prefix = Buffer.from([0, 0, 0, 243])
    // return Buffer.concat([prefix, encoded]);
    return encoded;
  }
};
