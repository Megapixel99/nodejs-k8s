const K8Object = require('./object.js');
const { ConfigMap: Model } = require('../database/models.js');
const { isText, isBinary, duration } = require('../functions.js');

class ConfigMap extends K8Object {
  constructor(config) {
    super(config);
    this.data = config.data;
    this.binaryData = config.binaryData;
    this.immutable = config.immutable;
  }

  static apiVersion = 'v1';
  static kind = 'ConfigMap';

  static findOne(params = {}, projection = {}, options = {}) {
    return Model.findOne(params, projection, options)
      .then((configMap) => {
        if (configMap) {
          return new ConfigMap(configMap).setResourceVersion();
        }
      });
  }

  static find(params = {}, projection = {}, options = {}) {
    return Model.find(params, projection, options)
      .then((configMaps) => {
        if (configMaps) {
          return Promise.all(configMaps.map((configMap) => new ConfigMap(configMap).setResourceVersion()));
        }
      });
  }

  static create(config) {
    const base64RegExp = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;
    const isBase64 = (str) => base64RegExp.test(str);

    return this.findOne({ 'metadata.name': config.metadata.name, 'metadata.namespace': config.metadata.namespace })
    .then((existingConfigMap) => {
      if (existingConfigMap) {
        throw this.alreadyExistsStatus(config.metadata.name);
      }
      if (config.data) {
        Object.entries(config.data).forEach(([key, value]) => {
          if (!isText(null, Buffer.from(value))) {
            throw this.unprocessableContentStatus(undefined, `Value for ${key} is not UTF-8`);
          }
        });
      }
      if (config.binaryData) {
        Object.entries(config.binaryData).forEach(([key, value]) => {
          if (!isBinary(null, Buffer.from(Buffer.from(value, 'base64').toString('binary'), 'base64'))) {
            throw this.unprocessableContentStatus(undefined, `Value for ${key} is not Binary`);
          }
        });
      }
      return new Model(config).save();
    })
    .then((configMap) => new ConfigMap(configMap));
  }

  static findAllSorted(queryOptions = {}, sortOptions = { 'created_at': 1 }) {
    let params = {
      'metadata.namespace': queryOptions.namespace ? queryOptions.namespace : undefined,
      'metadata.resourceVersion': queryOptions.resourceVersionMatch ? queryOptions.resourceVersionMatch : undefined,
    };
    let projection = {};
    let options = {
      sort: sortOptions,
      limit: queryOptions.limit ? Number(queryOptions.limit) : undefined,
    };
    return this.find(params, projection, options);
  }

  static list (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (configMaps) => ({
        apiVersion: this.apiVersion,
        kind: `${this.kind}List`,
        metadata: {
          continue: false,
          remainingItemCount: queryOptions.limit && queryOptions.limit < configMaps.length ? configMaps.length - queryOptions.limit : 0,
          resourceVersion: `${await super.hash(`${configMaps.length}${JSON.stringify(configMaps[0])}`)}`
        },
        items: configMaps
      }));
  }

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (configMaps) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${configMaps.length}${JSON.stringify(configMaps[0])}`)}`,
        },
        "columnDefinitions": [
          {
            "name": "Name",
            "type": "string",
            "format": "name",
            "description": "Name must be unique within a namespace. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names#names",
            "priority": 0
          },
          {
            "name": "Data",
            "type": "string",
            "format": "",
            "description": "Data contains the configuration data. Each key must consist of alphanumeric characters, '-', '_' or '.'. Values with non-UTF-8 byte sequences must use the BinaryData field. The keys stored in Data must not overlap with the keys in the BinaryData field, this is enforced during validation process.",
            "priority": 0
          },
          {
            "name": "BinaryData",
            "type": "string",
            "format": "",
            "description": "BinaryData contains the binary data. Each key must consist of alphanumeric characters, '-', '_' or '.'. BinaryData can contain byte sequences that are not in the UTF-8 range. The keys stored in BinaryData must not overlap with the ones in the Data field, this is enforced during validation process. Using this field will require 1.10+ apiserver and kubelet.",
            "priority": 1
          },
          {
            "name": "Immutable",
            "type": "boolean",
            "format": "",
            "description": "Immutable, if set to true, ensures that data stored in the ConfigMap cannot be updated (only object metadata can be modified). If not set to true, the field can be modified at any time. Defaulted to nil.",
            "priority": 1
          },
          {
            "name": "Age",
            "type": "string",
            "format": "",
            "description": "CreationTimestamp is a timestamp representing the server time when this object was created. It is not guaranteed to be set in happens-before order across separate operations. Clients may not set this value. It is represented in RFC3339 form and is in UTC.\n\nPopulated by the system. Read-only. Null for lists. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata",
            "priority": 0
          }
        ],
        "rows": configMaps.map((e) => ({
          "cells": [
            e.metadata.name,
            Object.keys(e.data).length,
            Object.keys(e.binaryData).length,
            e.immutable ?? false,
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

  delete () {
    return Model.findOneAndDelete({ 'metadata.name': this.metadata.name, 'metadata.namespace': this.metadata.namespace })
    .then((configMap) => {
      if (configMap) {
        return this.setConfig(configMap);
      }
    });
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
      throw new Error(`ConfigMap ${config.metadata.name} is immutable`);
    }
    return Model.findOneAndUpdate(
      { 'metadata.name': this.metadata.name, 'metadata.namespace': this.metadata.namespace },
      updateObj,
      {
        new: true,
        ...options,
      }
    )
    .then((configMap) => {
      if (configMap) {
        return this.setConfig(configMap);
      }
    });
  }

  async setResourceVersion() {
    await super.setResourceVersion();
    return this;
  }

  mapVariables() {
    return [
      [...this.data]
        .map(([key, value]) => ({
          name: key,
          value,
        })),
      [...this.binaryData]
        .map(([key, value]) => ({
          name: key,
          value: Buffer.from(Buffer.from(value, 'base64').toString('binary'), 'base64').toString(),
        }))
    ].flat();
  }

  async setConfig(config) {
    await super.setResourceVersion();
    this.data = config.data;
    return this;
  }
}

module.exports = ConfigMap;
