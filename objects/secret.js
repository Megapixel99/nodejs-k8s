const K8Object = require('./object.js');
const { Secret: Model } = require('../database/models.js');

class Secret extends K8Object {
  constructor(config) {
    super(config);
    this.data = config.data;
    this.type = config.type;
  }

  static findOne(params = {}, options = {}) {
    return Model.findOne(params, options)
      .then((secret) => {
        if (secret) {
          return new Secret(secret);
        }
      });
  }

  static find(params = {}, options = {}) {
    return Model.find(params, options)
      .then((secrets) => {
        if (secrets) {
          return secrets.map((secret) => new Secret(secret));
        }
      });
  }

  static create(config) {
    const base64RegExp = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;
    const isBase64 = (str) => base64RegExp.test(str);

    return this.findOne({ 'metadata.name': config.metadata.name, 'metadata.namespace': config.metadata.namespace })
    .then((existingSecret) => {
      if (existingSecret) {
        throw new Error(`Secret ${config.metadata.name} already exists`);
      }
      Object.entries(config.data).forEach(([key, value]) => {
        if (isBase64(value)) {
          config.data[key] = value;
          return;
        }
        config.data[key] = Buffer.from(value).toString('base64');
      });
      return new Model(config).save();
    })
    .then((secret) => new Secret(secret));
  }

  delete () {
    return Model.findOneAndDelete({ 'metadata.name': this.metadata.name, 'metadata.namespace': config.metadata.namespace })
    .then((secret) => {
      if (secret) {
        return this.setConfig(secret);
      }
    });
  }

  static notFoundStatus(objectName = '') {
    return super.notFoundStatus('Secret', objectName);
  }

  update(updateObj, options = {}) {
    return Model.findOneAndUpdate(
      { 'metadata.name': this.metadata.name },
      updateObj,
      {
        new: true,
        ...options,
      }
    )
    .then((secret) => {
      if (secret) {
        let newSecret = this.setConfig(secret);
        return newSecret;
      }
    });
  }

  mapVariables() {
    if (this.type === 'Opaque') {
      return [...this.data]
        .map(([key, value]) => ({
          name: key,
          value: Buffer.from(value, 'base64').toString(),
        }));
    }
    return null;
  }

  setConfig(config) {
    this.data = config.data;
    return this;
  }
}

module.exports = Secret;
