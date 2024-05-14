const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { APIService: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class APIService extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = APIService.apiVersion;
    this.kind = APIService.kind;
    this.Model = APIService.Model;
  }

  static apiVersion = 'apiregistration.k8s.io/v1';
  static kind = 'APIService';
  static Model = Model;

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (apiServices) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${apiServices.length}${JSON.stringify(apiServices[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": apiServices.map((e) => ({
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

module.exports = APIService;
