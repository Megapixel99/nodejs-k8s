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

  static notFoundStatus(objectKind = '', objectName = '') {
    return new Status({
      status: 'Failure',
      reason: 'NotFound',
      message: `${objectKind.toLowerCase()} "${objectName}" not found`,
      details: {
        name: objectName,
        kind: objectKind.toLowerCase(),
      }
    });
  }
}

module.exports = Object;
