const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { Job: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class Job extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = Job.apiVersion;
    this.kind = Job.kind;
    this.Model = Job.Model;
  }

  static apiVersion = 'v1';
  static kind = 'Job';
  static Model = Model;

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (jobs) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${jobs.length}${JSON.stringify(jobs[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": jobs.map((e) => ({
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

module.exports = Job;