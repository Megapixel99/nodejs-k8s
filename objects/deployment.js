const Object = require('./object.js');
const Pod = require('./pod.js');
const Service = require('./service.js');
const { Deployment: Model } = require('../database/models.js');
const {
  runImage,
  getContainerIP,
  getAllContainersWithName,
}  = require('../functions.js');

class Deployment extends Object {
  constructor(config) {
    super(config);
    this.spec = config.spec;
    this.status = config.status;
    this.rollingOut = false;
  }

  static findOne(params) {
    return Model.findOne(params)
      .then((deployment) => {
        if (deployment) {
          return new Deployment(deployment);
        }
      });
  }

  static find(params) {
    return Model.find(params)
      .then((deployments) => {
        if (deployments) {
          return deployments.map((deployment) => new Deployment(deployment));
        }
      });
  }

  static create(config) {
    return this.findOne({ 'metadata.name': config.metadata.name })
    .then((existingDeployment) => {
      if (existingDeployment) {
        throw new Error(`Deployment ${config.metadata.name} already exists`);
      }
      return new Model(config).save()
    })
    .then((deployment) => {
      let newDeployment = new Deployment(deployment);
      if (newDeployment.spec.paused !== true) {
        newDeployment.rollout();
      }
      setInterval(() => {
        if (newDeployment.rollingOut === false) {
          Promise.all(
            newDeployment.spec.template.spec.containers
              .map((e) => getAllContainersWithName(newDeployment.spec.template.metadata.name, e.image))
          )
          .then((containers) => containers.map((e) => e.raw))
          .then((raw) => raw.toString().split('\n').filter((e) => e !== ''))
          .then((arr) => {
            if (newDeployment.rollingOut === false) {
              if (newDeployment.spec.replicas > arr.length) {
                newDeployment.rollout(newDeployment.spec.replicas - arr.length);
              } else if (newDeployment.spec.replicas < arr.length) {
                new Array(arr.length - newDeployment.spec.replicas)
                  .fill(0).forEach(() => newDeployment.deletePod());
              }
            }
          })
        }
      }, 1000);
      return newDeployment;
    })
  }

  delete () {
    return Model.findOneAndDelete({ 'metadata.name': this.metadata.name })
    .then((deployment) => {
      if (deployment) {
        return this.setConfig(deployment);
      }
    });
  }

  update(updateObj) {
    return Model.findOneAndUpdate(
      { 'metadata.name': this.metadata.name },
      updateObj,
      { new: true }
    )
    .then((deployment) => {
      if (deployment) {
        let newDeployment = this.setConfig(deployment);
        if (newDeployment.spec.paused !== true &&
          this.rollingOut === false &&
          JSON.stringify(this.spec.template) !== JSON.stringify(deployment.spec.template)) {
          newDeployment.rollout();
        }
        return newDeployment;
      }
    });
  }

  setConfig(config) {
    this.spec = config.spec;
    this.status = config.status;
    return this;
  }

  getSpec() {
    return this.spec;
  }

  getStatus() {
    return this.status;
  }

  deletePod() {
    return Pod.find(
      { 'metadata.name': this.spec.template.metadata.name },
      {},
      {
        sort: {
          'created_at': 1
        }
      }
    )
    .then((pods) => {
      if (pods[0]) {
        return Promise.all([
          pods[0].stop(),
          pods[0].delete(),
          Service.findOne({
            'metadata.name': this.metadata.name
          })
          .then((service) => {
            if (service) {
              service.removePod(pod[0].status.podIP)
            }
          })
        ])
        .then(() => {
          this.update({
            $inc: {
              'status.readyReplicas': -1,
              'status.replicas': -1,
              'status.availableReplicas': -1,
            },
          })
        })
      }
    })
  }

  async createPod(config) {
    if (!config?.metadata?.labels) {
      config.metadata.labels = new Map();
    }
    config.metadata.labels.set('app', this.metadata.name);
    if (!config?.metadata?.namespace) {
      config.metadata.namespace = this.metadata.namespace
    }
    return Pod.create(config)
    .then((newPod) => {
      return Promise.all([
        this.update({
          $inc: {
            'status.replicas': 1,
            'status.readyReplicas': 1,
            'status.availableReplicas': 1,
          },
          $set: {
            conditions: [{
              "type": "Progressing",
              "status": "True",
              "lastUpdateTime": new Date(),
              "lastTransitionTime": new Date(),
            },
            {
              "type": "Available",
              "status": "True",
              "lastUpdateTime": new Date(),
              "lastTransitionTime": new Date(),
            }]
          }
        }),
        Service.findOne({ 'metadata.name': this.metadata.name })
        .then((service) => {
          if (service) {
            return service.addPod(newPod.status.podIP);
          }
        })
      ])
    })
    .then(() => {
      if (this?.status?.replicas > this?.spec?.replicas) {
        return this.deletePod();
      }
    })
  }

  async rollout(numPods = this.spec.replicas) {
    if (this.rollingOut === false) {
      this.rollingOut = true;
      if (this.spec.strategy.type === "RollingUpdate") {
        let percent = Number(`${this.spec.strategy.rollingUpdate.maxUnavailable}`.match(/\d*/)[0]);;
        let newPods = 0;
        do {
          await Promise.all(
            new Array(Math.ceil(numPods * percent / 100))
            .fill(0)
            .map(() => {
              newPods += 1;
              return this.createPod(this.spec.template);
            })
          );
        } while (this.status.replicas < numPods);
      } else if (this.spec.strategy.type === "Recreate") {
        Promise.all(
          new Array(numPods)
          .fill(0)
          .map(() => {
            return this.deletePod();
          })
        ).then(() =>
          new Array(numPods)
          .fill(0)
          .map(() => {
            return this.createPod(this.spec.template);
          })
        )
      }
    }
    this.rollingOut = false;
  }
}

module.exports = Deployment;
