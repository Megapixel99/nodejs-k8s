const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { IngressClass: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class IngressClass extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = IngressClass.apiVersion;
    this.kind = IngressClass.kind;
    this.Model = IngressClass.Model;
  }

  static apiVersion = 'v1';
  static kind = 'IngressClass';
  static Model = Model;

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (ingressClasses) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${ingressClasses.length}${JSON.stringify(ingressClasses[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": ingressClasses.map((e) => ({
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

module.exports = IngressClass;