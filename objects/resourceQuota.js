const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { ResourceQuota: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class ResourceQuota extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = ResourceQuota.apiVersion;
    this.kind = ResourceQuota.kind;
    this.Model = ResourceQuota.Model;
  }

  static apiVersion = 'v1';
  static kind = 'ResourceQuota';
  static Model = Model;

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (resourceQuotas) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${resourceQuotas.length}${JSON.stringify(resourceQuotas[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": resourceQuotas.map((e) => ({
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

module.exports = ResourceQuota;