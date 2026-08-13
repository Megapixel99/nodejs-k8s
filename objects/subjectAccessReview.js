const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { SubjectAccessReview: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class SubjectAccessReview extends K8Object {
  constructor(config) {
        super(config);
    let _src = (config && typeof config.toObject === 'function') ? config.toObject() : (config || {});
    for (const key of Object.keys(_src)) {
      if (key === 'apiVersion' || key === 'kind' || key === 'metadata') continue;
      if (key === '_id' || key === '__v') continue;
      this[key] = _src[key];
    }
    this.apiVersion = SubjectAccessReview.apiVersion;
    this.kind = SubjectAccessReview.kind;
    this.Model = SubjectAccessReview.Model;
  }

  static apiVersion = 'v1';
  static kind = 'SubjectAccessReview';
  static Model = Model;


  static create(config) {
    config = { ...config, status: { allowed: true, reason: 'simulated', ...(config.status || {}) } };
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

module.exports = SubjectAccessReview;
