const Object = require('./object.js');
const Pod = require('./pod.js');
const { Service: Model, DNS } = require('../database/models.js');
const {
  addPortsToService,
  addPortToService,
  addPodToService,
  removePortFromService,
  removePodFromService,
  pullImage,
  imageExists,
  buildImage,
  runImage,
  getContainerIP,
} = require('../functions.js');

class Service extends Object {
  constructor(config) {
    super(config);
    this.spec = config.spec;
    this.status = config.status;
  }

  static findOne(params) {
    return Model.findOne(params)
      .then((service) => {
        if (service) {
          return new Service(service);
        }
      });
  }

  static find(params) {
    return Model.find(params)
      .then((services) => {
        if (services) {
          return services.map((service) => new Service(service));
        }
      });
  }

  static create(config) {
    return this.findOne({ 'metadata.name': config.metadata.name })
    .then((existingService) => {
      if (existingService) {
        throw new Error(`Service ${config.metadata.name} already exists`);
      }
      return new Model(config).save()
    })
    .then((service) => {
      let newService = new Service(service);
      return pullImage('node')
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
        .then((ipInfo) => JSON.parse(ipInfo?.raw)[0]?.NetworkSettings?.Networks?.bridge?.IPAddress)
        .then((serviceIP) => {
          if (serviceIP) {
            return this.update({
              $set: {
                'spec.clusterIP': serviceIP,
                'spec.clusterIPs': [serviceIP],
              }
            });
          }
        })
        .then(async () => {
          await new DNS({
            name: `${req.body.metadata.name}.${req.body.metadata.namespace}.cluster.local`,
            type: 'A',
            class: 'IN',
            ttl: 300,
            address: newService.spec.clusterIP,
          }).save()
          return newService;
        });
    });
  }

  delete () {
    return Model.findOneAndDelete({ 'metadata.name': this.metadata.name, 'metadata.namespace': config.metadata.namespace })
    .then((service) => {
      if (service) {
        return this.setConfig(service);
      }
    });
  }

  update(updateObj) {
    return Model.findOneAndUpdate(
      { 'metadata.name': this.metadata.name, 'metadata.namespace': config.metadata.namespace },
      updateObj,
      { new: true }
    )
    .then((service) => {
      if (service) {
        return this.setConfig(service);
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

  removePort(port) {
    return removePortFromService(this.metadata.generateName, port);
  }

  addPorts(ports) {
    return addPortsToService(this.metadata.generateName, ports);
  }

  addPort(port) {
    return addPortToService(this.metadata.generateName, port);
  }

  removePod(podIP) {
    return removePodFromService(this.metadata.generateName, podIP);
  }

  addPod(podIP) {
    return addPodToService(this.metadata.generateName, podIP);
  }
}

module.exports = Service;
