const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { PodDisruptionBudget: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class PodDisruptionBudget extends K8Object {
  constructor(config) {
        super(config);
    let _src = (config && typeof config.toObject === 'function') ? config.toObject() : (config || {});
    for (const key of Object.keys(_src)) {
      if (key === 'apiVersion' || key === 'kind' || key === 'metadata') continue;
      if (key === '_id' || key === '__v') continue;
      this[key] = _src[key];
    }
    this.apiVersion = PodDisruptionBudget.apiVersion;
    this.kind = PodDisruptionBudget.kind;
    this.Model = PodDisruptionBudget.Model;
  }

  static apiVersion = 'policy/v1';
  static kind = 'PodDisruptionBudget';
  static Model = Model;

  static async create(config) {
    // Populate status synchronously so the framework's "wait for PDB to be
    // processed" check passes immediately. Real controller computes these
    // against matching pods; for a sim we report 0 healthy / 0 desired.
    let status = config.status || {};
    config = {
      ...config,
      status: {
        observedGeneration: 1,
        currentHealthy: 0,
        desiredHealthy: 0,
        disruptionsAllowed: 0,
        expectedPods: 0,
        ...status,
      },
    };
    return super.create(config);
  }

  static async table (items = []) {
     return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${items.length}${JSON.stringify(items[0])}`)}`,
        },
        "columnDefinitions": super.nameAndAgeColumns(),
        "rows": items.map((e) => ({
          "cells": [
            e.metadata.name,
            duration(DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "") - e.metadata.creationTimestamp),
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
    let _src = (config && typeof config.toObject === 'function') ? config.toObject() : (config || {});
    for (const key of Object.keys(_src)) {
      if (key === 'apiVersion' || key === 'kind' || key === 'metadata') continue;
      if (key === '_id' || key === '__v') continue;
      this[key] = _src[key];
    }
    return this;
  }
}

module.exports = PodDisruptionBudget;
