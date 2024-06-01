const K8Object = require('../objects/object.js');

module.exports = {
  fromProtoBuf: (req, res, next) => {
    if (!req.body || !req.headers['content-type']?.includes('protobuf') || !req.operationId) {
      return next();
    }
    let b = req.body.subarray(4, req.body.length);
    let unknownType = req.protobufTypes.lookup("Unknown");
    let { typeMeta, raw } = unknownType.decode(b);
    let dataType = req.protobufTypes.lookup(req.operationId);
    let dataInfo = dataType.decode(raw);
    req.body = {
      ...typeMeta,
      ...dataInfo
    };
    console.log('Request Body:');
    console.log(req.body);
    next();
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
