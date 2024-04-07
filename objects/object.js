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

  async setResourceVersion() {
    this.metadata = {
      ...this.metadata,
      resourceVersion: `${await Object.hash(JSON.stringify(this))}`
    }
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

  static notFoundStatus(kind = undefined, name = undefined, group = undefined) {
    return new Status({
      status: 'Failure',
      reason: 'NotFound',
      code: 404,
      message: kind && name ? `${kind.toLowerCase()} "${name}" not found` : undefined,
      details: {
        name,
        group,
        kind: kind ? kind.toLowerCase() : undefined,
      }
    });
  }

  static forbiddenStatus(kind = undefined, name = undefined, group = undefined) {
    return new Status({
      status: 'Failure',
      reason: 'Forbidden',
      code: 403,
      message: kind && name ? `${kind.toLowerCase()} "${name}" is forbidden: User "" cannot get resource "${name}" in API group "${group}" in the ${kind.toLowerCase()} "${name}"` : undefined,
      details: {
        name,
        group,
        kind: kind ? kind.toLowerCase() : undefined,
      }
    });
  }

  static unprocessableContentStatus(kind = undefined, name = undefined, group = undefined, message = undefined) {
    return new Status({
      status: 'Failure',
      reason: 'UnprocessableContent',
      code: 422,
      message,
      details: {
        name,
        group,
        kind: kind ? kind.toLowerCase() : undefined,
      }
    });
  }

  static alreadyExistsStatus(kind = undefined, name = undefined, group = undefined) {
    return new Status({
      status: 'Failure',
      reason: 'AlreadyExists',
      code: 409,
      message: kind && name ? `${kind.toLowerCase()} "${name}" already exists` : undefined,
      details: {
        name,
        group,
        kind: kind ? kind.toLowerCase() : undefined,
      }
    });
  }

  static internalServerErrorStatus(kind = undefined, name = undefined, group = undefined) {
    return new Status({
      status: 'Failure',
      reason: 'InternalServerError',
      code: 500,
      message: "An internal server error has occured, please see the logs for more information",
      details: {
        name,
        group,
        kind: kind ? kind.toLowerCase() : undefined,
      }
    });
  }
}

module.exports = Object;
