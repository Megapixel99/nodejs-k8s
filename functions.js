const { dockerCommand } = require('docker-cli-js');
const { randomBytes } = require("crypto");
const { Pod, Deployment } = require('./database/models.js');
const portfinder = require('portfinder');
const emitter = require('./eventHandlers/emitter.js');

let duration = (timeDiff, loop = true) => {
  let y = 365 * 24 * 60 * 60 * 1000;
  let d = 24 * 60 * 60 * 10000;
  let h = 60 * 60 * 1000;
  let m = 60 * 1000;
  let s = 1000;
  if (timeDiff >= y) {
    let val = Math.floor(timeDiff / y);
    return `${val}y${duration(timeDiff - (y * val))}`;
  }
  if (timeDiff >= d) {
    let val = Math.floor(timeDiff / d);
    return `${val}d${duration(timeDiff - (d * val))}`;
  }
  if (timeDiff >= h) {
    let val = Math.floor(timeDiff / h);
    return `${val}h${duration(timeDiff - (h * val))}`;
  }
  if (timeDiff >= m) {
    let val = Math.floor(timeDiff / m);
    return `${val}m${duration(timeDiff - (m * val))}`;
  }
  if (timeDiff >= s) {
    return `${Math.floor(timeDiff / s)}s`;
  }
  return '0s';
};

let buildImage = (imageName, options) => dockerCommand(`build -t ${imageName} .`, options);
let pullImage = (imageName) => dockerCommand(`pull ${imageName}`);
let runImage = (imageName, containerName, options) => {
  return dockerCommand(`inspect --type=image ${imageName.includes(':') ? imageName.split(':')[0] : imageName}`, options)
  .then((data) => {
    if (data.length === 0 || (imageName.includes(':') && !data.object.find((e) => e.DockerVersion !== imageName.split(':')[1]))) {
      return pullImage(imageName)
    }
    return Promise.resolve();
  })
  .then(async () => {
    let cmd = `run --name ${containerName} -d `;

    if (Array.isArray(options.ports) && options.ports.length > 0) {
      cmd += (await Promise.all(options.ports.map(async (e) => {
        let port = await portfinder.getPortPromise();
        return `-p ${port}:${e} `;
      }))).join('');
    }
    if (Array.isArray(options.env) && options.env.length > 0) {
      cmd += options.env.map((e) => `-e ${e.name}=${e.value} `);
    }
    cmd += imageName;
    return dockerCommand(cmd);
  });
};
const stopContainer = (containerName) => dockerCommand(`stop ${containerName}`);
const deletePod = (name) => {
  return Pod.find({
    $or: [{
      'metadata.generateName': name,
    }, {
      'metadata.name': name,
    }]
  }, {}, { sort: { 'created_at' : 1 } })
  .then((pods) => {
    if (pods[0]) {
      return Pod.findOneAndDelete({
        'metadata.uid': pods[0].metadata.uid,
      });
    }
    return Promise.resolve();
  })
  .then((pod) => {
    if (pod) {
      return Promise.all([
        stopContainer(pod.metadata.generateName),
        Deployment.findOneAndUpdate({
          'metadata.name': pod.metadata.labels.get("app"),
        }, {
          $inc: {
            'status.readyReplicas': -1,
            'status.replicas': -1,
            'status.availableReplicas': -1,
          },
        }),
      ]);
    }
    return Promise.resolve();
  });
};

module.exports = {
  duration,
  buildImage,
  pullImage,
  runImage,
  stopContainer,
  deletePod,
  createPod: async (newPod, deployment = '') => {
    let otherPod = undefined;
    do {
      newPod.metadata.generateName = `${newPod.metadata.name}-${randomBytes(6).toString('hex')}`;
      otherPod = await Pod.findOne({ metadata: { generateName: newPod.metadata.generateName } });
    } while (otherPod !== null);
    if (!newPod?.metadata?.creationTimestamp) {
      newPod.metadata.creationTimestamp = new Date();
    }
    if (!newPod.status) {
      newPod.status = {};
    }
    if (!newPod.status.conditions) {
      newPod.status.conditions = [];
    }
    if (deployment) {
      if (!newPod?.metadata?.labels) {
        newPod.metadata.labels = new Map();
      }
      newPod.metadata.labels.set('app', deployment);
    }
    newPod.status.conditions.push({
      type: "Initialized",
      status: 'True',
      lastTransitionTime: new Date(),
    });
    return new Pod(newPod).save()
    .then(() => {
      let p = newPod.spec.containers.map((e) => {
        let options = {
          ...e,
          ports: e.ports.map((e) => e.containerPort),
        };
        return runImage(e.image, newPod.metadata.generateName, options);
        // return Promise.resolve();
      });
      return Promise.all(p);
    })
    .then(() => {
      return Pod.findOneAndUpdate({
        'metadata.generateName': newPod.metadata.generateName
      }, {
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
            "name": newPod.metadata.name,
            "state": {
              "running": {
                "startedAt": new Date(),
              }
            },
            "imageID": "",
            "image": "",
            "lastState": {},
            "containerID": newPod.metadata.generateName
          }
        },
        $set: {
          'status.phase': 'Running',
        }
      })
    })
    .then(() => {
      // emitter.emit('podReady', [newPod.metadata.generateName, deployment]);
      let promises = [
        Pod.findOneAndUpdate({
          'metadata.generateName': newPod.metadata.generateName
        }, {
          $push: {
            'status.conditions': [{
              type: "PodScheduled",
              status: 'True',
              lastTransitionTime: new Date(),
            }],
          }
        })
      ];
      if (deployment) {
        promises.push(Deployment.findOneAndUpdate({
          'metadata.name': deployment
        }, {
          $inc: {
            'status.readyReplicas': 1,
            'status.availableReplicas': 1,
          },
        }));
      }
      return Promise.all(promises);
    })
    .then(() => {
      if (deployment) {
        return Deployment.findOne({
          'metadata.name': deployment
        });
      }
      return Promise.resolve();
    })
    .then((deploymentInfo) => {
      if (deploymentInfo) {
        return Deployment.findOneAndUpdate({
          'metadata.name': deployment
        }, {
          $inc: {
            'status.replicas': 1,
          },
          $set: {
            conditions: [{
              "type": "Progressing",
              "status": "True",
              "lastUpdateTime": new Date(),
              "lastTransitionTime": deploymentInfo.metadata.creationTimestamp,
            },
            {
              "type": "Available",
              "status": "True",
              "lastUpdateTime": new Date(),
              "lastTransitionTime": new Date(),
            }]
          }
        }, {
          new: true,
        });
      }
    })
    .then((deploymentInfo) => {
      if (deploymentInfo?.status?.replicas > deploymentInfo?.spec?.replicas) {
        return deletePod(deployment);
      }
      return Promise.resolve();
    })
    .catch((err) => {
      console.error(err);
    });
  }
};
