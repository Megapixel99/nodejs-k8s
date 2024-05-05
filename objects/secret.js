const K8Object = require('./object.js');
const { Secret: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class Secret extends K8Object {
  constructor(config) {
    super(config);
    this.immutable = config.immutable;
    this.stringData = config.stringData;
    this.data = config.data;
    this.type = config.type;
  }

  static apiVersion = 'v1';
  static kind = 'Secret';


  static findOne(params = {}, options = {}) {
    return Model.findOne(params, options)
      .then((secret) => {
        if (secret) {
          return new Secret(secret).setResourceVersion();
        }
      });
  }

  static find(params = {}, options = {}) {
    return Model.find(params, options)
      .then((secrets) => {
        if (secrets) {
          return Promise.all(secrets.map((secret) => new Secret(secret).setResourceVersion()));
        }
      });
  }

  static create(config) {
    const base64RegExp = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;
    const isBase64 = (str) => base64RegExp.test(str);

    return this.findOne({ 'metadata.name': config.metadata.name, 'metadata.namespace': config.metadata.namespace })
    .then((existingSecret) => {
      if (existingSecret) {
        throw this.alreadyExistsStatus(config.metadata.name);
      }
      if (config.data) {
        Object.entries(config.data).forEach(([key, value]) => {
          if (isBase64(value)) {
            config.data[key] = value;
            return;
          }
          config.data[key] = Buffer.from(value).toString('base64');
        });
      }
      return new Model(config).save();
    })
    .then((secret) => new Secret(secret));
  }

  delete () {
    return Model.findOneAndDelete({ 'metadata.name': this.metadata.name, 'metadata.namespace': this.metadata.namespace })
    .then((secret) => {
      if (secret) {
        return this.setConfig(secret);
      }
    });
  }

  static findAllSorted(queryOptions = {}, sortOptions = { 'created_at': 1 }) {
    let params = {
      'metadata.namespace': queryOptions.namespace ? queryOptions.namespace : undefined,
      'metadata.resourceVersion': queryOptions.resourceVersionMatch ? queryOptions.resourceVersionMatch : undefined,
    };
    if (!([...new Set(Object.values(params))].find((e) => undefined))) {
      params = {};
    }
    let projection = {};
    let options = {
      sort: sortOptions,
      limit: queryOptions.limit ? Number(queryOptions.limit) : undefined,
    };
    return this.find(params, projection, options);
  }

  static list (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (secrets) => ({
        apiVersion: this.apiVersion,
        kind: `${this.kind}List`,
        metadata: {
          continue: false,
          remainingItemCount: queryOptions.limit && queryOptions.limit < secrets.length ? secrets.length - queryOptions.limit : 0,
          resourceVersion: `${await super.hash(`${secrets.length}${JSON.stringify(secrets[0])}`)}`
        },
        items: secrets
      }));
  }

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (secrets) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${secrets.length}${JSON.stringify(secrets[0])}`)}`,
        },
        "columnDefinitions": [
          {
            "name": "Name",
            "type": "string",
            "format": "name",
            "description": "Name must be unique within a namespace. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: http://kubernetes.io/docs/user-guide/identifiers#names",
            "priority": 0
          },
          {
            "name": "Type",
            "type": "string",
            "format": "",
            "description": "The type of secret",
            "priority": 0
          },
          {
            "name": "Data",
            "type": "string",
            "format": "",
            "description": "Number of items in the secret",
            "priority": 0
          },
          {
            "name": "Age",
            "type": "string",
            "format": "",
            "description": "CreationTimestamp is a timestamp representing the server time when this object was created. It is not guaranteed to be set in happens-before order across separate operations. Clients may not set this value. It is represented in RFC3339 form and is in UTC.\n\nPopulated by the system. Read-only. Null for lists. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata",
            "priority": 0
          },
        ],
        "rows": secrets.map((e) => ({
          "cells": [
            e.metadata.name,
            e.type,
            e.data.length,
            duration(new Date() - e.metadata.creationTimestamp),
          ],
          object: {
            "kind": "PartialObjectMetadata",
            "apiVersion": "meta.k8s.io/v1",
            metadata: e.metadata,
          }
        })),
      }));
  }

  static notFoundStatus(objectName = undefined) {
    return super.notFoundStatus(this.kind, objectName);
  }

  static forbiddenStatus(objectName = undefined) {
    return super.forbiddenStatus(this.kind, objectName);
  }

  static alreadyExistsStatus(objectName = undefined) {
    return super.alreadyExistsStatus(this.kind, objectName);
  }

  static unprocessableContentStatus(objectName = undefined, message = undefined) {
    return super.unprocessableContentStatus(this.kind, objectName, undefined, message);
  }

  update(updateObj, options = {}) {
    if (this?.immutable === true) {
      throw new Error(`Secret ${config.metadata.name} is immutable`);
    }
    return Model.findOneAndUpdate(
      { 'metadata.name': this.metadata.name, 'metadata.namespace': this.metadata.namespace },
      updateObj,
      {
        new: true,
        ...options,
      }
    )
    .then((secret) => {
      if (secret) {
        return this.setConfig(secret);
      }
    });
  }

  mapVariables() {
    // TODO: add other types
    if (this.type === 'Opaque') {
      return [
        [...this.data]
          .map(([key, value]) => ({
            name: key,
            value: Buffer.from(value, 'base64').toString(),
          })),
        [...this.stringData]
          .map(([key, value]) => ({
            name: key,
            value,
          }))
      ].flat();
    }
    return null;
  }

  async setResourceVersion() {
    await super.setResourceVersion();
    return this;
  }

  async setConfig(config) {
    await super.setResourceVersion();
    this.data = config.data;
    return this;
  }
}

module.exports = Secret;
