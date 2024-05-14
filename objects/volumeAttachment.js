const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { VolumeAttachment: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class VolumeAttachment extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
    this.apiVersion = VolumeAttachment.apiVersion;
    this.kind = VolumeAttachment.kind;
    this.Model = VolumeAttachment.Model;
  }

  static apiVersion = 'v1';
  static kind = 'VolumeAttachment';
  static Model = Model;

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (volumeAttachments) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${volumeAttachments.length}${JSON.stringify(volumeAttachments[0])}`)}`,
        },
        "columnDefinitions": [],
        "rows": volumeAttachments.map((e) => ({
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

module.exports = VolumeAttachment;