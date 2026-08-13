const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { TokenRequest: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class TokenRequest extends K8Object {
  constructor(config) {
        super(config);
    let _src = (config && typeof config.toObject === 'function') ? config.toObject() : (config || {});
    for (const key of Object.keys(_src)) {
      if (key === 'apiVersion' || key === 'kind' || key === 'metadata') continue;
      if (key === '_id' || key === '__v') continue;
      this[key] = _src[key];
    }
    this.apiVersion = TokenRequest.apiVersion;
    this.kind = TokenRequest.kind;
    this.Model = TokenRequest.Model;
  }

  static apiVersion = 'authentication.k8s.io/v1';
  static kind = 'TokenRequest';
  static Model = Model;


  static create(config) {
    let token = require('crypto').randomBytes(32).toString('hex');
    config = { ...config, status: { token, expirationTimestamp: new Date(Date.now() + 3600 * 1000).toISOString(), ...(config.status || {}) } };
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

module.exports = TokenRequest;
