const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { DaemonSet: Model } = require('../database/models.js');
const {
  duration,
  isContainerRunning,
} = require('../functions.js');

class DaemonSet extends K8Object {
  constructor(config) {
    super(config);
    this.spec = config.spec;
    this.status = config.status;
    this.apiVersion = DaemonSet.apiVersion;
    this.kind = DaemonSet.kind;
    this.Model = DaemonSet.Model;
  }

  static apiVersion = 'apps/v1';
  static kind = 'DaemonSet';
  static Model = Model;

  static async table (queryOptions = {}) {
    return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${daemonSets.length}${JSON.stringify(daemonSets[0])}`)}`,
        },
        "columnDefinitions": [
          {
            "name": "Name",
            "type": "string",
            "format": "name",
            "description": "Name must be unique within a daemonSet. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: http://kubernetes.io/docs/user-guide/identifiers#names",
            "priority": 0
          },
          {
            "name": "Age",
            "type": "string",
            "format": "",
            "description": "CreationTimestamp is a timestamp representing the server time when this object was created. It is not guaranteed to be set in happens-before order across separate operations. Clients may not set this value. It is represented in RFC3339 form and is in UTC.\n\nPopulated by the system. Read-only. Null for lists. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata",
            "priority": 0
          },
        ],
        "rows": daemonSets.map((e) => ({
          "cells": [
            e.metadata.name,
            duration(DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "") - e.metadata.creationTimestamp),
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
    this.data = config.data;
    return this;
  }
}

module.exports = DaemonSet;
