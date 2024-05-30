const K8Object = require('../objects/object.js');

module.exports = {
  fromProtoBuf: (req, res, next) => {
    if (!req.body || !req.headers['content-type']?.includes('protobuf') || !req.operationId) {
      return next();
    }
    let b = req.body.subarray(4, req.body.length);
    try {
      console.log(req.operationId);
      let unknownType = req.protobufTypes.lookup("Unknown");
      let { typeMeta, raw } = unknownType.decode(b);
      let dataType = req.protobufTypes.lookup(req.operationId);
      let dataInfo = dataType.decode(raw);
      req.body = {
        ...typeMeta,
        ...dataInfo
      };
      console.log(req.body);
      next();
    } catch (e) {
      console.error(e);
      next(K8Object.unprocessableContentStatus());
    }
  },
  toProtoBuf: (data, operationId, protobufTypes) => {
    console.log(operationId);
    let dataType = protobufTypes.lookup(operationId);
    let dataInfo = dataType.encode(data).finish();
    let unknownType = protobufTypes.lookup("Unknown");
    return unknownType.encode(dataInfo).finish();
  }
};
