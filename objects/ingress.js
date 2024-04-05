const Object = require('./object.js');
const Pod = require('./pod.js');
const Service = require('./service.js');
const { Ingress: Model, DNS } = require('../database/models.js');

class Ingress extends Object {
  constructor(config) {
    super(config);
    this.spec = config.spec;
    this.status = config.status;
  }

  static findOne(params) {
    return Model.findOne(params)
      .then((ingress) => {
        if (ingress) {
          return new Ingress(ingress);
        }
      });
  }

  static find(params) {
    return Model.find(params)
      .then((ingresses) => {
        if (ingresses) {
          return ingresses.map((ingress) => new Ingress(ingress));
        }
      });
  }

  static create(config) {
    return this.findOne({ 'metadata.name': config.metadata.name })
    .then((existingIngress) => {
      if (existingIngress) {
        throw new Error(`Ingress ${config.metadata.name} already exists`);
      }
      return new Model(config).save()
    })
    .then(async (ingress) => {
      await Promise.all(
        req.body.spec.rules.map((rule) => {
          return rule.http.paths.map((path) => {
            return Service.findOne({ 'metadata.name': path.backend.serviceName })
              .then((service) => {
                let arr = []
                if (service?.externalIPs?.length > 0) {
                  arr.push(
                    ...service.externalIPs.map((e) => {
                      new DNS({
                        name: rule.host,
                        type: 'A',
                        class: 'IN',
                        ttl: 300,
                        address: e,
                      }).save()
                    })
                  );
                }
              })
          })
          .flat()
          .filter((e) => e);
        }));
      return ingress;
    })
  }

  delete () {
    return Model.findOneAndDelete({ 'metadata.name': this.metadata.name })
    .then((ingress) => {
      if (ingress) {
        return this.setConfig(ingress);
      }
    });
  }

  update(updateObj) {
    return Model.findOneAndUpdate(
      { 'metadata.name': this.metadata.name },
      updateObj,
      { new: true }
    )
    .then((ingress) => {
      if (ingress) {
        return this.setConfig(ingress);
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
}

module.exports = Ingress;
