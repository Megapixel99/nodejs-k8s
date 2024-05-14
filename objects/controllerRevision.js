const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { ControllerRevision: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class ControllerRevision extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = ControllerRevision.apiVersion;
    this.kind = ControllerRevision.kind;
    this.Model = ControllerRevision.Model;
  }

  static apiVersion = 'v1';
  static kind = 'ControllerRevision';
  static Model = Model;

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (controllerRevisions) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${controllerRevisions.length}${JSON.stringify(controllerRevisions[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": controllerRevisions.map((e) => ({
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

module.exports = ControllerRevision;