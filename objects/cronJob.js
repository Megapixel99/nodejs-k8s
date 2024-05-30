const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { CronJob: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class CronJob extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = CronJob.apiVersion;
    this.kind = CronJob.kind;
    this.Model = CronJob.Model;
  }

  static apiVersion = 'v1';
  static kind = 'CronJob';
  static Model = Model;

  static async table (queryOptions = {}) {
    return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${cronJobs.length}${JSON.stringify(cronJobs[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": cronJobs.map((e) => ({
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

module.exports = CronJob;
