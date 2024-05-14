const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { PriorityClass: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class PriorityClass extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = PriorityClass.apiVersion;
    this.kind = PriorityClass.kind;
    this.Model = PriorityClass.Model;
  }

  static apiVersion = 'v1';
  static kind = 'PriorityClass';
  static Model = Model;

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (priorityClasses) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${priorityClasses.length}${JSON.stringify(priorityClasses[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": priorityClasses.map((e) => ({
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

module.exports = PriorityClass;