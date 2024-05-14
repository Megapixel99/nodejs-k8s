const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { NetworkPolicy: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class NetworkPolicy extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = NetworkPolicy.apiVersion;
    this.kind = NetworkPolicy.kind;
    this.Model = NetworkPolicy.Model;
  }

  static apiVersion = 'v1';
  static kind = 'NetworkPolicy';
  static Model = Model;

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (networkPolicys) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${networkPolicys.length}${JSON.stringify(networkPolicys[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": networkPolicys.map((e) => ({
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

module.exports = NetworkPolicy;