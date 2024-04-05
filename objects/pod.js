const Object = require('./object.js');
const { Pod: Model } = require('../database/models.js');
const {
  runImage,
  stopContainer,
  getContainerIP,
  randomBytes
} = require('../functions.js');

class Pod extends Object {
  constructor(config) {
    super(config);
    this.spec = config.spec;
    this.status = config.status;
  }

  static findOne(params) {
    return Model.findOne(params)
      .then((pod) => {
        if (pod) {
          return new Pod(pod);
        }
      });
  }

  static find(params) {
    return Model.find(params)
      .then((pods) => {
        if (pods) {
          return pods.map((pod) => new Pod(pod));
        }
      });
  }

  static async create(config) {
    let otherPod = undefined;
    do {
      config.metadata.generateName = `${config.metadata.name}-${randomBytes(6).toString('hex')}`;
      otherPod = await Pod.findOne({ 'metadata.generateName': config.metadata.generateName });
    } while (otherPod);
    if (!config?.metadata?.creationTimestamp) {
      config.metadata.creationTimestamp = new Date();
    }
    if (!config.status) {
      config.status = {};
    }
    if (!config.status.conditions) {
      config.status.conditions = [];
    }
    config.status.conditions.push({
      type: "Initialized",
      status: 'True',
      lastTransitionTime: new Date(),
    });
    return new Model(config).save()
    .then((pod) => {
      let newPod = this.setConfig(pod);
      let p = newPod.spec.containers.map((e) => {
        let options = {
          expose: e.ports.map((a) => a.containerPort),
        }
        return runImage(e.image, newPod.metadata.generateName, options);
      });
      return Promise.all(p)
      .then(() => getContainerIP(config.metadata.generateName))
      .then((data) => JSON.parse(data.raw)[0]?.NetworkSettings.Networks.bridge.IPAddress)
      .then((podIP) => {
        return newPod.update({
          $push: {
            'status.conditions': [{
              type: "Ready",
              status: 'True',
              lastTransitionTime: new Date(),
            }, {
              type: "ContainersReady",
              status: 'True',
              lastTransitionTime: new Date(),
            }],
            'status.containerStatuses': {
              "restartCount": 0,
              "started": true,
              "ready": true,
              "name": config.metadata.name,
              "state": {
                "running": {
                  "startedAt": new Date(),
                }
              },
              "imageID": "",
              "image": "",
              "lastState": {},
              "containerID": newPod.metadata.generateName
            },
            'status.podIPs': {
              ip: podIP
            },
          },
          $set: {
            'status.phase': 'Running',
            'status.podIP': podIP,
          }
        })
      })
      .then(() => {
        return newPod.update({
          $push: {
            'status.conditions': [{
              type: "PodScheduled",
              status: 'True',
              lastTransitionTime: new Date(),
            }],
          }
        });
      });
    })
  }

  setConfig(config) {
    this.spec = config.spec;
    this.status = config.status;
    return this;
  }

  delete () {
    return Model.findOneAndDelete({ 'metadata.name': this.metadata.name })
    .then((pod) => {
      if (pod) {
        return this.setConfig(pod);
      }
    });
  }

  update(updateObj) {
    return Model.findOneAndUpdate(
      { 'metadata.name': this.metadata.name },
      updateObj,
      { new: true }
    )
    .then((pod) => {
      if (pod) {
        return this.setConfig(pod);
      }
    });
  }

  stop() {
    return stopContainer(this.metadata.generateName);
  }

  start() {
    let p = this.spec.containers.map((e) => {
      let options = {
        expose: e.ports.map((a) => a.containerPort),
      }
      return runImage(e.image, newPod.metadata.generateName, options);
    });
    return Promise.all(p);
  }

  getSpec() {
    return this.spec;
  }

  getStatus() {
    return this.status;
  }
}

module.exports = Pod;
