const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const Pod = require('./pod.js');
const { ReplicationController: Model } = require('../database/models.js');
const {
  duration,
  isContainerRunning,
} = require('../functions.js');

class ReplicationController extends K8Object {
  constructor(config) {
    super(config);
    this.spec = config.spec;
    this.status = config.status;
    this.apiVersion = ReplicationController.apiVersion;
    this.kind = ReplicationController.kind;
    this.Model = ReplicationController.Model;
  }

  static apiVersion = 'v1';
  static kind = 'ReplicationController';
  static Model = Model;

  deletePods(numPods) {
    if (this.status.replicas < 1) {
      return Promise.resolve();
    }
    let opts = { sort: { 'created_at': 1 } };
    if (numPods) {
      opts.limit = numPods;
    }
    return Pod.find(
      { 'metadata.name': this.spec.template.metadata.name, 'metadata.namespace': this.metadata.namespace },
      opts,
    )
    .then((pods) => {
      return Promise.all(pods.map(async (pod) => {
        await pod.delete();
        let update = {
          $inc: {
            'status.availableReplicas': -1,
            'status.fullyLabeledReplicas': -1,
            'status.readyReplicas': -1,
            'status.replicas': -1,
          }
        }
        return super.patch(update);
      }));
    })
  }

  async delete() {
    return Promise.all([
      super.delete(),
      this.deletePods()
    ]);
  }

  static async create(config) {
    return super.create(config)
    .then((rc) => new ReplicationController(rc))
  }

  async createPods(numPods) {
    if (!this.spec?.template?.metadata?.labels) {
      this.spec.template.metadata.labels = new Map();
    }
    this.spec?.template.metadata.labels.set('app', this.spec?.template.metadata.name);
    if (!this.spec?.template?.metadata?.namespace) {
      this.spec.template.metadata.namespace = this.metadata.namespace
    }
    let start = DateTime.now();
    let minReadySeconds = Infinity;
    let arr = new Array(numPods ?? this.spec.replicas).fill(
      Promise.all([
        Pod.create(this.spec.template),
        super.patch({
          $inc: {
            'status.replicas': 1,
          }
        })
      ])
      .then(() => {
        let update = {
          $inc: {
            'status.availableReplicas': 1,
            'status.fullyLabeledReplicas': 1,
            'status.readyReplicas': 1,
          }
        }
        if (DateTime.now() - start < minReadySeconds) {
          minReadySeconds = DateTime.now() - start;
          update['$set'] = {
            'spec.minReadySeconds': minReadySeconds,
          };
        }
        return super.patch(update);
      })
    );
    return Promise.all(arr);
  }

  static async table (queryOptions = {}) {
    return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${replicationControllers.length}${JSON.stringify(replicationControllers[0])}`)}`,
        },
        "columnDefinitions": [
          {
            "name": "Name",
            "type": "string",
            "format": "name",
            "description": "Name must be unique within a replicationController. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: http://kubernetes.io/docs/user-guide/identifiers#names",
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
        "rows": replicationControllers.map((e) => ({
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

module.exports = ReplicationController;
