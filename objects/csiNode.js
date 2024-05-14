const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { CSINode: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class CSINode extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = CSINode.apiVersion;
    this.kind = CSINode.kind;
    this.Model = CSINode.Model;
  }

  static apiVersion = 'v1';
  static kind = 'CSINode';
  static Model = Model;

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (csiNodes) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${csiNodes.length}${JSON.stringify(csiNodes[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": csiNodes.map((e) => ({
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

module.exports = CSINode;