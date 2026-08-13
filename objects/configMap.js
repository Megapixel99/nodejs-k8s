const { DateTime } = require('luxon');
const { writeFile, mkdir } = require('fs/promises');
const { rmSync } = require('fs');
const path = require('path');
const K8Object = require('./object.js');
const { ConfigMap: Model } = require('../database/models.js');
const { isText, isBinary, duration, countEntries } = require('../functions.js');

class ConfigMap extends K8Object {
  constructor(config) {
    super(config);
    this.data = config.data;
    this.binaryData = config.binaryData;
    this.immutable = config.immutable;
    this.apiVersion = ConfigMap.apiVersion;
    this.kind = ConfigMap.kind;
    this.Model = ConfigMap.Model;
  }

  static apiVersion = 'v1';
  static kind = 'ConfigMap';
  static Model = Model;

  static create(config) {
    const base64RegExp = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;
    const isBase64 = (str) => base64RegExp.test(str);
    let q = { 'metadata.name': config.metadata.name, 'metadata.namespace': config.metadata.namespace };
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
    return super.create(config, q, { validateBeforeSave: false })
    .then((configMap) => new ConfigMap(configMap))
    .then(async (_configMap) => {
      let configMap = _configMap.toJSON();
      let dir = path.resolve(`${__dirname}/../volumes/${ConfigMap.volumeDirName(configMap)}`);
      await mkdir(dir, { recursive: true });
      await Promise.all(Object.entries({ ...configMap.binaryData, ...configMap.data }).map(([key, value]) => {
        let data = configMap.binaryData && key in configMap.binaryData
          ? Buffer.from(value, 'base64')
          : value;
        return writeFile(path.join(dir, key), data);
      }));
      return _configMap;
    });
  }

  static volumeDirName(cm) {
    return `${cm.metadata.namespace || 'default'}_${cm.metadata.name}`;
  }

  delete () {
    return super.delete()
    .then((configMap) => {
      if (configMap) {
        rmSync(path.resolve(`${__dirname}/../volumes/${ConfigMap.volumeDirName(configMap)}`), { recursive: true, force: true });
      }
      return configMap;
    });
  }

  static async table (configMaps) {
    return {
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
            countEntries(e.data),
            countEntries(e.binaryData),
            e.immutable ?? false,
            duration(DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "") - e.metadata.creationTimestamp),
          ],
          object: {
            "kind": "PartialObjectMetadata",
            "apiVersion": "meta.k8s.io/v1",
            metadata: e.metadata,
          }
        })),
    }
  }

  mapVariables() {
    const toEntries = (x) => {
      if (!x) return [];
      if (x instanceof Map) return [...x.entries()];
      return Object.entries(x);
    };
    return [
      ...toEntries(this.data).map(([name, value]) => ({ name, value })),
      ...toEntries(this.binaryData).map(([name, value]) => ({
        name,
        value: Buffer.from(value, 'base64').toString('utf8'),
      })),
    ];
  }

  async setConfig(config) {
    await super.setResourceVersion();
    this.data = config.data;
    this.binaryData = config.binaryData;
    this.immutable = config.immutable;
    return this;
  }
}

module.exports = ConfigMap;
