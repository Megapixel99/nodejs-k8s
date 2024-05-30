const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { SelfSubjectReview: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class SelfSubjectReview extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = SelfSubjectReview.apiVersion;
    this.kind = SelfSubjectReview.kind;
    this.Model = SelfSubjectReview.Model;
  }

  static apiVersion = 'authentication.k8s.io/v1';
  static kind = 'SelfSubjectReview';
  static Model = Model;

  static async table (queryOptions = {}) {
    return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${selfSubjectReviews.length}${JSON.stringify(selfSubjectReviews[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": selfSubjectReviews.map((e) => ({
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

module.exports = SelfSubjectReview;
