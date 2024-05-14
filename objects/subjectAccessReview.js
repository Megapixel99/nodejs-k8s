const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { SubjectAccessReview: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class SubjectAccessReview extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = SubjectAccessReview.apiVersion;
    this.kind = SubjectAccessReview.kind;
    this.Model = SubjectAccessReview.Model;
  }

  static apiVersion = 'v1';
  static kind = 'SubjectAccessReview';
  static Model = Model;

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (subjectAccessReviews) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${subjectAccessReviews.length}${JSON.stringify(subjectAccessReviews[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": subjectAccessReviews.map((e) => ({
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

module.exports = SubjectAccessReview;