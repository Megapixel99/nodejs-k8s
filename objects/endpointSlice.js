const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { EndpointSlice: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class EndpointSlice extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = EndpointSlice.apiVersion;
    this.kind = EndpointSlice.kind;
    this.Model = EndpointSlice.Model;
  }

  static apiVersion = 'v1';
  static kind = 'EndpointSlice';
  static Model = Model;

  static async table (queryOptions = {}) {
    return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${endpointSlices.length}${JSON.stringify(endpointSlices[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": endpointSlices.map((e) => ({
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

module.exports = EndpointSlice;
