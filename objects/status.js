const Object = require('./object.js');

class Secret {
  constructor(config) {
    this.kind = "Status";
    this.apiVersion = "v1";
    this.metadata = {};
    this.code = config.code;
    this.message = config.message;
    this.reason = config.reason;
    this.status = config.status;
    this.details = config.details;
  }

  setConfig(config) {
    this.code = config.code;
    this.message = config.message;
    this.reason = config.reason;
    this.status = config.status;
    this.details = config.details;
    return this;
  }

  setStatus(status) {
    this.status = status;
    return this;
  }

  setMessage(message) {
    this.message = message;
    return this;
  }

  setReason(reason) {
    this.reason = reason;
    return this;
  }

  setDetails(details) {
    this.details = details;
    return this;
  }

  getSpec() {
    return this.spec;
  }

  getStatus() {
    return this.status;
  }
}

module.exports = Secret;
