const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { PodDisruptionBudget: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class PodDisruptionBudget extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = PodDisruptionBudget.apiVersion;
    this.kind = PodDisruptionBudget.kind;
    this.Model = PodDisruptionBudget.Model;
  }

  static apiVersion = 'v1';
  static kind = 'PodDisruptionBudget';
  static Model = Model;

  static async table (queryOptions = {}) {
     return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${podDisruptionBudgets.length}${JSON.stringify(podDisruptionBudgets[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": podDisruptionBudgets.map((e) => ({
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

module.exports = PodDisruptionBudget;
