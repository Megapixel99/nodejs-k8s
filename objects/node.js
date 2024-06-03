const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { Node: Model } = require('../database/models.js');
const Namespace = require('./namespace.js');
const Deployment = require('./deployment.js');
const Service = require('./service.js');
const {
  duration,
  isContainerRunning,
} = require('../functions.js');

class Node extends K8Object {
  constructor(config) {
    super(config);
    this.spec = config.spec;
    this.status = config.status;
    this.apiVersion = Node.apiVersion;
    this.kind = Node.kind;
    this.Model = Node.Model;
  }

  static apiVersion = 'v1';
  static kind = 'Node';
  static Model = Model;

  static create(config) {
    return this.findOne({ 'metadata.name': config.metadata.name })
    .then((existingNode) => {
      if (existingNode) {
        throw this.alreadyExistsStatus(config.metadata.name);
      }
      config.status.allocatable = config.status.capacity;
      config.status.conditions = [{
        "type": "Ready",
        "status": "False",
        "lastHeartbeatTime": DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ""),
        "lastTransitionTime": DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ""),
        "reason": "KubeletNotReady",
        "message": "kubelet is not ready"
      }]
      return new Model(config).save();
    })
    .then((node) => new Node(node))
    .then(async (node) => {
      let i = setInterval(async () => {
        let isRunning = Boolean(await isContainerRunning(node.metadata.labels.get('name')));
        if (isRunning) {
          clearInterval(i);
          let createNamespace = (name) => Namespace.create({ metadata: { name } });
          await Promise.all([
            Namespace.findOne({ 'metadata.name': 'kube-system' })
              .then((namespace) => namespace ? Promise.resolve() : createNamespace('kube-system'))
              .then(() => Deployment.find({ 'metadata.name': { $regex: `^core-dns` } , 'metadata.namespace': 'kube-system' }))
              .then((deployment) => {
                if (deployment) {
                  return deployment;
                }
                return Deployment.create({
                  metadata: {
                    name: `core-dns-${rc.length + 1}`,
                    namespace: 'kube-system',
                  },
                  spec: {
                    strategy: {
                      rollingUpdate: {
                        maxSurge: '25%',
                        maxUnavailable: '25%',
                      },
                      type: 'RollingUpdate',
                    },
                    template: {
                      metadata: {
                        name: 'core-dns',
                        namespace: 'kube-system',
                        labels: {
                          name: "core-dns",
                          role: "core-dns"
                        },
                      },
                      status: {
                        hostIP: node?.status?.addresses?.find((e) => e.type === 'InternalIP')?.address,
                      },
                      spec: {
                        containers: [{
                          name: "core-dns",
                          image: "dns:latest",
                          ports: [{
                            name: "udp",
                            containerPort: 5333
                          }, {
                            name: "tcp",
                            containerPort: 5334
                          }],
                        }]
                      }
                    }
                  }
                });
              }),
            Namespace.findOne({ 'metadata.name': 'default' })
              .then((namespace) => namespace ? Promise.resolve() : createNamespace('default'))
              .then(() => Service.findOne({ 'metadata.name': 'kubernetes' , 'metadata.namespace': 'default' }))
              .then((service) => {
                if (service) {
                  return;
                }
                return Service.create({
                  metadata: {
                    name: "kubernetes",
                    namespace: "default",
                    labels: {
                      app: "kubernetes",
                      namespace: "default"
                    }
                  },
                  spec: {
                    ports: [],
                    selector: {
                      app: null,
                    }
                  }
                });
              }),
            Namespace.findOne({ 'metadata.name': 'kube-public' })
              .then((namespace) => namespace ? Promise.resolve() : createNamespace('kube-public')),
            Namespace.findOne({ 'metadata.name': 'kube-node-lease' })
              .then((namespace) => namespace ? Promise.resolve() : createNamespace('kube-node-lease')),
          ])
            .catch((err) => {
              throw err;
            });
          node.patch({
            'status.images': [{
              names: [ node.metadata.labels.get('name') ],
              sizeBytes: node.status.capacity.get('ephemeral-storage').match(/[0-9]/g)[0]
            }],
            'status.phase': 'Running',
            'status.conditions': [{
              "type": "MemoryPressure",
              "status": "False",
              "lastHeartbeatTime": DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ""),
              "lastTransitionTime": DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ""),
              "reason": "KubeletHasSufficientMemory",
              "message": "kubelet has sufficient memory available"
            }, {
              "type": "DiskPressure",
              "status": "False",
              "lastHeartbeatTime": DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ""),
              "lastTransitionTime": DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ""),
              "reason": "KubeletHasNoDiskPressure",
              "message": "kubelet has no disk pressure"
            }, {
              "type": "PIDPressure",
              "status": "False",
              "lastHeartbeatTime": DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ""),
              "lastTransitionTime": DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ""),
              "reason": "KubeletHasSufficientPID",
              "message": "kubelet has sufficient PID available"
            }, {
              "type": "Ready",
              "status": "True",
              "lastHeartbeatTime": DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ""),
              "lastTransitionTime": DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ""),
              "reason": "KubeletReady",
              "message": "kubelet is posting ready status"
            }],
          })
            .catch((err) => {
              throw err;
            });
        }
      }, 1000);
      return node;
    })
  }

  delete () {
    return Model.findOneAndDelete({ 'metadata.name': this.metadata.name })
    .then(async (node) => {
      let nodes = await Model.find({});
      if (nodes.length === 0) {
        await Promise.all((await Namespace.find({})).map((namespace) => namespace.delete()))
      }
      if (node) {
        return this.setConfig(node);
      }
    });
  }

  async setConfig(config) {
    await super.setResourceVersion();
    this.data = config.data;
    return this;
  }
}

module.exports = Node;
