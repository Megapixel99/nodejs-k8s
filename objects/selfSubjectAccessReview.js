const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { SelfSubjectAccessReview: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class SelfSubjectAccessReview extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = SelfSubjectAccessReview.apiVersion;
    this.kind = SelfSubjectAccessReview.kind;
    this.Model = SelfSubjectAccessReview.Model;
  }

  static apiVersion = 'v1';
  static kind = 'SelfSubjectAccessReview';
  static Model = Model;

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (selfSubjectAccessReviews) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${selfSubjectAccessReviews.length}${JSON.stringify(selfSubjectAccessReviews[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": selfSubjectAccessReviews.map((e) => ({
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

module.exports = SelfSubjectAccessReview;