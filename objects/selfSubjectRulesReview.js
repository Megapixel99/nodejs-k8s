const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { SelfSubjectRulesReview: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class SelfSubjectRulesReview extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = SelfSubjectRulesReview.apiVersion;
    this.kind = SelfSubjectRulesReview.kind;
    this.Model = SelfSubjectRulesReview.Model;
  }

  static apiVersion = 'v1';
  static kind = 'SelfSubjectRulesReview';
  static Model = Model;

  static async table (queryOptions = {}) {
    return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${selfSubjectRulesReviews.length}${JSON.stringify(selfSubjectRulesReviews[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": selfSubjectRulesReviews.map((e) => ({
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

module.exports = SelfSubjectRulesReview;
