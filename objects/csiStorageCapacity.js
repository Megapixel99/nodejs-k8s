const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { CSIStorageCapacity: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class CSIStorageCapacity extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = CSIStorageCapacity.apiVersion;
    this.kind = CSIStorageCapacity.kind;
    this.Model = CSIStorageCapacity.Model;
  }

  static apiVersion = 'v1';
  static kind = 'CSIStorageCapacity';
  static Model = Model;

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (csiStorageCapacitys) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${csiStorageCapacitys.length}${JSON.stringify(csiStorageCapacitys[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": csiStorageCapacitys.map((e) => ({
          "cells": [
            e.metadata.name,
            duration(DateTime.now().toUTC().toISO().replace(/.d{0,3}/, "") - e.metadata.creationTimestamp),
          ],
          object: {
            "kind": "PartialObjectMetadata",
            "apiVersion": "meta.k8s.io/v1",
            metadata: e.metadata,
          }
        })),
      }));
  }

  async setConfig(config) {
    await super.setResourceVersion();
    this.rules = config.rules;
    return this;
  }
}

module.exports = CSIStorageCapacity;