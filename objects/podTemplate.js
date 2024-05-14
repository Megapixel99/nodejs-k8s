const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { PodTemplate: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class PodTemplate extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = PodTemplate.apiVersion;
    this.kind = PodTemplate.kind;
    this.Model = PodTemplate.Model;
  }

  static apiVersion = 'v1';
  static kind = 'PodTemplate';
  static Model = Model;

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (podTemplates) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${podTemplates.length}${JSON.stringify(podTemplates[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": podTemplates.map((e) => ({
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

module.exports = PodTemplate;