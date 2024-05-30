const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { PersistentVolumeClaim: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class PersistentVolumeClaim extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = PersistentVolumeClaim.apiVersion;
    this.kind = PersistentVolumeClaim.kind;
    this.Model = PersistentVolumeClaim.Model;
  }

  static apiVersion = 'v1';
  static kind = 'PersistentVolumeClaim';
  static Model = Model;

  static async table (queryOptions = {}) {
    return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${persistentVolumeClaims.length}${JSON.stringify(persistentVolumeClaims[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": persistentVolumeClaims.map((e) => ({
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

module.exports = PersistentVolumeClaim;
