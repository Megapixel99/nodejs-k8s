const { dockerCommand } = require('docker-cli-js');
const { randomBytes } = require("crypto");
const { Pod, Deployment, Service } = require('./database/models.js');
const portfinder = require('portfinder');

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

let imageExists = (imageName, options) => dockerCommand(`inspect --type=image ${imageName.includes(':') ? imageName.split(':')[0] : imageName}`, options)
  .then((res) => !(res.length === 0 || (imageName.includes(':') && !res.object.find((e) => e.DockerVersion !== imageName.split(':')[1]))));
let buildImage = (imageName, dockerfile = 'Dockerfile', options) => {
  return dockerCommand(`build -t ${imageName} -f ${dockerfile} .`, options)
};
let pullImage = (imageName) => dockerCommand(`pull ${imageName}`);
let dockerExec = (containerName, command) => dockerCommand(`exec -it ${containerName} ${command}`);
let runImage = (imageName, containerName, options) => {
  return imageExists(imageName, options)
  .catch(() => pullImage(imageName))
  .then(async () => {
    let cmd = `run `;

    if (Array.isArray(options?.ports) && options?.ports.length > 0) {
      cmd += (await Promise.all(options.ports.map(async (e) => {
        return `-p ${e} `;
      }))).join('');
    }
    if (Array.isArray(options?.expose) && options?.expose.length > 0) {
      cmd += (await Promise.all(options.expose.map(async (e) => {
        return `--expose ${e} `;
      }))).join('');
    }
    if (Array.isArray(options?.env) && options?.env.length > 0) {
      cmd += options.env.map((e) => `-e ${e.name}='${e.value}' `).join('');
    }
    cmd += `--name ${containerName} -itd ${imageName}`
    console.log(cmd);
    return dockerCommand(cmd);
  });
};
const stopContainer = (containerName) => dockerCommand(`stop ${containerName}`);

const getContainerIP = (containerName) => dockerCommand(`inspect ${containerName}`)

const addPodsToService = (containerName, pods) => {
  let ips = pods.map((e) => e.status.podIP);
  return dockerExec(containerName, `bin/bash -c '${ips.map((e) => `echo "pod add ${e}" > /proc/1/fd/0`).join(' ; ')}'`)
    .then(() => ips);
}

const addPortsToService = (containerName, ports) => {
  return dockerExec(containerName, `bin/bash -c '${ports.map((e) => `echo "port add ${e}" > /proc/1/fd/0`).join(' ; ')}'`)
    .then(() => ports);
}

const addPortToService = (containerName, port) => {
  return dockerExec(containerName, `bin/bash -c 'echo "port add ${port}" > /proc/1/fd/0`);
}

const addPodToService = (containerName, podIP) => {
  return dockerExec(containerName, `bin/bash -c 'echo "pod add ${podIP}" > /proc/1/fd/0`);
}

const removePortFromService = (containerName, port) => {
  return dockerExec(containerName, `bin/bash -c 'echo "port remove ${port}" > /proc/1/fd/0`);
}

const removePodFromService = (containerName, podIP) => {
  return dockerExec(containerName, `bin/bash -c 'echo "pod remove ${podIP}" > /proc/1/fd/0`);
}

const deletePod = (name) => {
  return Pod.find({
    $or: [{
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
        Service.findOne({
          'metadata.name': name
        })
        .then((service) => {
          if (service) {
            return removePodFromService(service.metadata.generateName, pod.status.podIP);
          }
        }),
        Deployment.findOneAndUpdate({
          'metadata.name': pod.metadata.labels.get("app"),
        }, {
          $inc: {
            'status.readyReplicas': -1,
            'status.replicas': -1,
            'status.availableReplicas': -1,
          },
        }),
      ])
      .then(() => pod);
    }
    return Promise.resolve();
  });
};

const createService = async (service) => {
  let otherService = undefined;
  let newService = undefined;
  do {
    service.metadata.generateName = `${service.metadata.name}-${randomBytes(6).toString('hex')}`;
    otherService = await Service.findOne({ 'metadata.generateName': service.metadata.generateName });
  } while (otherService !== null);
  return new Service(service).save()
    .then((s) => {
      newService = s;
      return pullImage('node');
    })
    .then(() => imageExists('loadbalancer'))
    .catch((err) => buildImage('loadbalancer', 'loadBalancer/Dockerfile'))
    .then(() => Pod.find({ 'metadata.name': service.metadata.name }))
    .then((pods) => {
      let options = {
        ports: service.spec.ports.map((e) => `${e.port}:${e.port}`),
        env: [{
          name: 'PORTS',
          value: service.spec.ports.map((e) => `${e.port}:${e.targetPort}`).join(' '),
        }, {
          name: 'DNS_SERVER',
          value: process.env.DNS_SERVER,
        }, {
          name: 'PODS',
          value: pods.map((e) => e.status.podIP).join(' '),
        }]
      }
      return runImage('loadbalancer', service.metadata.generateName, options)
    })
    .then(() => getContainerIP(service.metadata.generateName))
    .then((data) => JSON.parse(data.raw)[0]?.NetworkSettings.Networks.bridge.IPAddress)
    .then((serviceIP) => {
      return Service.findOneAndUpdate({
        'metadata.generateName': service.metadata.generateName
      }, {
        $set: {
          'spec.clusterIP': serviceIP,
          'spec.clusterIPs': [serviceIP],
        }
      }, {
        new: true,
      });
    })
    .then((updatedService) => updatedService);
}

module.exports = {
  duration,
  createService,
  addPodToService,
  removePodFromService,
  getContainerIP,
  buildImage,
  pullImage,
  runImage,
  stopContainer,
  deletePod,
  createPod: async (newPod, deploymentName = undefined) => {
    let otherPod = undefined;
    do {
      newPod.metadata.generateName = `${newPod.metadata.name}-${randomBytes(6).toString('hex')}`;
      otherPod = await Pod.findOne({ 'metadata.generateName': newPod.metadata.generateName });
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
    if (deploymentName) {
      if (!newPod?.metadata?.labels) {
        newPod.metadata.labels = new Map();
      }
      newPod.metadata.labels.set('app', deploymentName);
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
          expose: e.ports.map((a) => a.containerPort),
        }
        return runImage(e.image, newPod.metadata.generateName, options);
      });
      return Promise.all(p);
    })
    .then(() => getContainerIP(newPod.metadata.generateName))
    .then((data) => JSON.parse(data.raw)[0]?.NetworkSettings.Networks.bridge.IPAddress)
    .then((podIP) => {
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
      return Pod.findOneAndUpdate({
        'metadata.generateName': newPod.metadata.generateName
      }, {
        $push: {
          'status.conditions': [{
            type: "PodScheduled",
            status: 'True',
            lastTransitionTime: new Date(),
          }],
        }
      }, {
        new: true,
      });
    }).then((pod) => {
      if (deploymentName) {
        return Promise.all([
          Deployment.findOneAndUpdate({
            'metadata.name': deploymentName
          }, {
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
          }, {
            new: true,
          }),
          Service.findOne({
            'metadata.name': deploymentName
          })
          .then((service) => {
            if (service) {
              return addPodToService(service.metadata.generateName, pod.status.podIP);
            }
          })
        ])
        .then((p) => p[0]);
      }
      return Promise.resolve();
    })
    .then((deploymentInfo) => {
      if (deploymentInfo?.status?.replicas > deploymentInfo?.spec?.replicas) {
        return deletePod(deployment.metadata.name);
      }
      return Promise.resolve();
    })
    .catch((err) => {
      console.error(err);
    });
  }
};
