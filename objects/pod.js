const Object = require('./object.js');

class Pod extends Object {
  constructor(config) {
    super(config);
    this.spec = config.spec;
    this.status = config.status;
  }

  getSpec() {
    return this.spec;
  }

  getStatus() {
    return this.status;
  }
}

module.exports = Pod;
