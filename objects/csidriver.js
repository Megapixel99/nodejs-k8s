const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { CSIDriver: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class CSIDriver extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = CSIDriver.apiVersion;
    this.kind = CSIDriver.kind;
    this.Model = CSIDriver.Model;
  }

  static apiVersion = 'storage.k8s.io/v1';
  static kind = 'CSIDriver';
  static Model = Model;

  static async table (queryOptions = {}) {
    return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${csidrivers.length}${JSON.stringify(csidrivers[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": csidrivers.map((e) => ({
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

module.exports = CSIDriver;
