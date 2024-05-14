const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { ValidatingWebhookConfiguration: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class ValidatingWebhookConfiguration extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = ValidatingWebhookConfiguration.apiVersion;
    this.kind = ValidatingWebhookConfiguration.kind;
    this.Model = ValidatingWebhookConfiguration.Model;
  }

  static apiVersion = 'v1';
  static kind = 'ValidatingWebhookConfiguration';
  static Model = Model;

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (validatingWebhookConfigurations) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${validatingWebhookConfigurations.length}${JSON.stringify(validatingWebhookConfigurations[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": validatingWebhookConfigurations.map((e) => ({
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

module.exports = ValidatingWebhookConfiguration;