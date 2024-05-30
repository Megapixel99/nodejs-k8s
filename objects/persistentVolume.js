const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { PersistentVolume: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class PersistentVolume extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = PersistentVolume.apiVersion;
    this.kind = PersistentVolume.kind;
    this.Model = PersistentVolume.Model;
  }

  static apiVersion = 'v1';
  static kind = 'PersistentVolume';
  static Model = Model;

  static async table (queryOptions = {}) {
    return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${persistentVolumes.length}${JSON.stringify(persistentVolumes[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": persistentVolumes.map((e) => ({
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

module.exports = PersistentVolume;
