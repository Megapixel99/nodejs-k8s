const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { StatefulSet: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class StatefulSet extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = StatefulSet.apiVersion;
    this.kind = StatefulSet.kind;
    this.Model = StatefulSet.Model;
  }

  static apiVersion = 'apps/v1';
  static kind = 'StatefulSet';
  static Model = Model;

  static async table (queryOptions = {}) {
    return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${statefulSets.length}${JSON.stringify(statefulSets[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": statefulSets.map((e) => ({
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
    }
  }

  async setConfig(config) {
    await super.setResourceVersion();
    this.rules = config.rules;
    return this;
  }
}

module.exports = StatefulSet;
