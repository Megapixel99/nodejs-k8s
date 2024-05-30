const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { RuntimeClass: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class RuntimeClass extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = RuntimeClass.apiVersion;
    this.kind = RuntimeClass.kind;
    this.Model = RuntimeClass.Model;
  }

  static apiVersion = 'node.k8s.io/v1';
  static kind = 'RuntimeClass';
  static Model = Model;

  static async table (queryOptions = {}) {
    return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${runtimeClasses.length}${JSON.stringify(runtimeClasses[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": runtimeClasses.map((e) => ({
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

module.exports = RuntimeClass;
