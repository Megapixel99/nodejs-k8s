const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { TokenReview: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class TokenReview extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = TokenReview.apiVersion;
    this.kind = TokenReview.kind;
    this.Model = TokenReview.Model;
  }

  static apiVersion = 'v1';
  static kind = 'TokenReview';
  static Model = Model;

  static async table (queryOptions = {}) {
    return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${tokenReviews.length}${JSON.stringify(tokenReviews[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": tokenReviews.map((e) => ({
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

module.exports = TokenReview;
