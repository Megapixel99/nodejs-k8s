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
}

module.exports = Object;
