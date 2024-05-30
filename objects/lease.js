const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { Lease: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class Lease extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = Lease.apiVersion;
    this.kind = Lease.kind;
    this.Model = Lease.Model;
  }

  static apiVersion = 'coordination.k8s.io/v1';
  static kind = 'Lease';
  static Model = Model;

  static async table (queryOptions = {}) {
    return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${leases.length}${JSON.stringify(leases[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": leases.map((e) => ({
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

module.exports = Lease;
