const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { CSINode: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class CSINode extends K8Object {
  constructor(config) {
        super(config);
    let _src = (config && typeof config.toObject === 'function') ? config.toObject() : (config || {});
    for (const key of Object.keys(_src)) {
      if (key === 'apiVersion' || key === 'kind' || key === 'metadata') continue;
      if (key === '_id' || key === '__v') continue;
      this[key] = _src[key];
    }
    this.apiVersion = CSINode.apiVersion;
    this.kind = CSINode.kind;
    this.Model = CSINode.Model;
  }

  static apiVersion = 'storage.k8s.io/v1';
  static kind = 'CSINode';
  static Model = Model;

  static async table (items = []) {
    return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${items.length}${JSON.stringify(items[0])}`)}`,
        },
        "columnDefinitions": super.nameAndAgeColumns(),
        "rows": items.map((e) => ({
          "cells": [
            e.metadata.name,
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

  async setConfig(config) {
        await super.setResourceVersion();
    let _src = (config && typeof config.toObject === 'function') ? config.toObject() : (config || {});
    for (const key of Object.keys(_src)) {
      if (key === 'apiVersion' || key === 'kind' || key === 'metadata') continue;
      if (key === '_id' || key === '__v') continue;
      this[key] = _src[key];
    }
    return this;
  }
}

module.exports = CSINode;
