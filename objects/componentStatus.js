const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { ComponentStatus: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class ComponentStatus extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = ComponentStatus.apiVersion;
    this.kind = ComponentStatus.kind;
    this.Model = ComponentStatus.Model;
  }

  static apiVersion = 'v1';
  static kind = 'ComponentStatus';
  static Model = Model;

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (componentStatuses) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${componentStatuses.length}${JSON.stringify(componentStatuses[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": componentStatuses.map((e) => ({
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

module.exports = ComponentStatus;