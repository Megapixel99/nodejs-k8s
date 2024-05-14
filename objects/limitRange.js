const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { LimitRange: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class LimitRange extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = LimitRange.apiVersion;
    this.kind = LimitRange.kind;
    this.Model = LimitRange.Model;
  }

  static apiVersion = 'v1';
  static kind = 'LimitRange';
  static Model = Model;

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (limitRanges) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${limitRanges.length}${JSON.stringify(limitRanges[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": limitRanges.map((e) => ({
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

module.exports = LimitRange;