const Status = require('./status.js');

class Object {
  constructor(config) {
    this.apiVersion = config.apiVersion;
    this.kind = config.kind;
    this.metadata = config.metadata;
  }

  getMetadata() {
    return this.metadata;
  }

  getKind() {
    return this.kind;
  }

  getApiVersion() {
    return this.apiVersion;
  }

  successfulStatus() {
    return new Status({
      status: 'Success',
      details: {
        name: this.metadata.name,
        kind: this.kind.toLowerCase(),
        uid: this.metadata.uid
      }
    });
  }

  static arrayBufferTo53bitNumber(buffer) {
    const view = new DataView(buffer);
    const first32bits = view.getUint32(0, true);
    const next21bits = view.getUint32(4, true) & 0b111111111111111111111;
    return first32bits * 0x200000 + next21bits;
  }

  static digest256(input) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  }

  static async hash(input) {
    const sha256 = await this.digest256(input);
    return this.arrayBufferTo53bitNumber(sha256);
  }

  static notFoundStatus(objectKind = '', objectName = '') {
    return new Status({
      status: 'Failure',
      reason: 'NotFound',
      code: 404,
      message: objectKind && objectName ? `${objectKind.toLowerCase()} "${objectName}" not found` : undefined,
      details: {
        name: objectName ? objectName : undefined,
        kind: objectKind ? objectKind.toLowerCase() : undefined,
      }
    });
  }

  static forbiddenStatus(objectKind = '', objectName = '', apiGroup = '') {
    return new Status({
      status: 'Failure',
      reason: 'Forbidden',
      code: 403,
      message: objectKind && objectName ? `${objectKind.toLowerCase()} "${objectName}" is forbidden: User "" cannot get resource "${objectName}" in API group "${apiGroup}" in the ${objectKind.toLowerCase()} "${objectName}"` : undefined,
      details: {
        name: objectName ? objectName : undefined,
        group: apiGroup ? apiGroup : undefined,
        kind: objectKind ? objectKind.toLowerCase() : undefined,
      }
    });
  }

  static unprocessableContentStatus(objectKind = '', objectName = '', apiGroup = '', message = '') {
    return new Status({
      status: 'Failure',
      reason: 'UnprocessableContent',
      code: 422,
      message: message ? message : undefined,
      details: {
        name: objectName ? objectName : undefined,
        group: apiGroup ? apiGroup : undefined,
        kind: objectKind ? objectKind.toLowerCase() : undefined,
      }
    });
  }

  static alreadyExistsStatus(objectKind = '', objectName = '', apiGroup = '') {
    return new Status({
      status: 'Failure',
      reason: 'AlreadyExists',
      code: 409,
      message: objectKind && objectName ? `${objectKind.toLowerCase()} "${objectName}" already exists` : undefined,
      details: {
        name: objectName ? objectName : undefined,
        group: apiGroup ? apiGroup : undefined,
        kind: objectKind ? objectKind.toLowerCase() : undefined,
      }
    });
  }

  static internalServerErrorStatus(objectKind = '', objectName = '', apiGroup = '') {
    return new Status({
      status: 'Failure',
      reason: 'InternalServerError',
      code: 500,
      message: "An internal server error has occured, please see the logs for more information",
      details: {
        name: objectName ? objectName : undefined,
        group: apiGroup ? apiGroup : undefined,
        kind: objectKind ? objectKind.toLowerCase() : undefined,
      }
    });
  }
}

module.exports = Object;
