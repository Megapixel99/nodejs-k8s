const Object = require('./object.js');
const {
  addPodToService,
  removePodFromService,
} = require('../functions.js');

class Service extends Object {
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

  deletePort(podIP) {
    let p = this.pods.findIndex((e) => e === podIP);
    this.pods.splice(p, 1);
  }

  addPort() {
    this.pods.push(podIP);
  }

  deletePod(podIP) {
    return removePodFromService(this.metadata.generateName, podIP);
  }

  addPod(podIP) {
    return addPodToService(this.metadata.generateName, podIP);
  }
}

module.exports = Service;
