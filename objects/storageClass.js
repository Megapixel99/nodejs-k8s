const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { StorageClass: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class StorageClass extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = StorageClass.apiVersion;
    this.kind = StorageClass.kind;
    this.Model = StorageClass.Model;
  }

  static apiVersion = 'v1';
  static kind = 'StorageClass';
  static Model = Model;

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (storageClasses) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${storageClasses.length}${JSON.stringify(storageClasses[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": storageClasses.map((e) => ({
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

module.exports = StorageClass;