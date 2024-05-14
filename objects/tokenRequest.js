const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { TokenRequest: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class TokenRequest extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = TokenRequest.apiVersion;
    this.kind = TokenRequest.kind;
    this.Model = TokenRequest.Model;
  }

  static apiVersion = 'authentication.k8s.io/v1';
  static kind = 'TokenRequest';
  static Model = Model;

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (tokenRequests) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${tokenRequests.length}${JSON.stringify(tokenRequests[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": tokenRequests.map((e) => ({
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

module.exports = TokenRequest;
