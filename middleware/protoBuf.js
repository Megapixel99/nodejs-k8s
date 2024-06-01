const K8Object = require('../objects/object.js');

module.exports = {
  fromProtoBuf: (data, operationId, protobufTypes) => {
    let b = data.subarray(4, data.length);
    let unknownType = protobufTypes.lookup("Unknown");
    let { typeMeta, raw } = unknownType.decode(b);
    let dataType = protobufTypes.lookup(operationId);
    let dataInfo = dataType.decode(raw);
    data = {
      ...typeMeta,
      ...dataInfo
    };
    console.log('Request Body:');
    return data;
  },
  toProtoBuf: (data, operationId, protobufTypes) => {
    if (Array.isArray(data) && !operationId.includes('List')) {
      operationId = `${operationId}List`;
    } else if (!Array.isArray(data) && operationId.includes('List')) {
      operationId = operationId.substring(0, operationId.length - 4);
    }
    let dataType = protobufTypes.lookup(operationId);
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
    let prefix = Buffer.from([107, 56, 115]);
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
    let prefix = Buffer.from([0, 0, 0, 243])
    return Buffer.concat([prefix, encoded]);
  }
};
