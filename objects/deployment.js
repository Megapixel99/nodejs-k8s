const Object = require('./object.js');
const functions = require('../functions.js');

class Deployment extends Object {
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

  deletePod() {
    return functions.deletePod(this.metadata.name);
  }

  createPod() {
    this.spec.template.metadata.namespace = this.metadata.namespace;
    this.spec.template.metadata.name = this.metadata.name;
    return functions.createPod(this.spec.template, this.metadata.name)
  }

  async rollout() {
    if (this.spec.strategy.type === "RollingUpdate") {
      let percent = Number(`${this.spec.strategy.rollingUpdate.maxUnavailable}`.match(/\d*/)[0]);;
      let newPods = 0;
      do {
        await Promise.all(
          new Array(Math.ceil(this.spec.replicas * percent / 100))
          .fill(0)
          .map(() => {
            newPods += 1;
            return this.createPod();
          })
        );
      } while (newPods < this.spec.replicas);
    } else if (this.spec.strategy.type === "Recreate") {
      Promise.all(
        new Array(this.spec.replicas)
        .fill(0)
        .map(() => {
          return this.deletePod();
        })
      ).then(() =>
        new Array(this.spec.replicas)
        .fill(0)
        .map(() => {
          return this.createPod();
        })
      )
    }
  }
}

module.exports = Deployment;
