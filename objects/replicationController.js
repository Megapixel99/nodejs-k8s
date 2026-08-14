const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const Pod = require('./pod.js');
const { ReplicationController: Model } = require('../database/models.js');
const { duration, isContainerRunning, age, randomBytes } = require('../functions.js');

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
    // This used to bail out when the in-memory status said there were no
    // replicas. That counter is whatever was loaded when the controller was
    // fetched, so deleting a deployment skipped the pod cleanup and left the
    // containers running — the query below is the real answer to "which pods
    // are mine".
    let opts = { sort: { 'created_at': 1 } };
    if (numPods) {
      opts.limit = numPods;
    }
    // Replicas are named `<controller>-<suffix>`, so matching the template's
    // single name found nothing once each pod got its own name.
    // find(filter, projection, options) — `opts` was landing in the projection
    // slot, so the sort/limit were read as fields to select and the pods came
    // back without metadata. Nothing matched, and the containers stayed up.
    return Pod.find(
      {
        'metadata.name': { $regex: `^${this.metadata.name}-` },
        'metadata.namespace': this.metadata.namespace,
      },
      {},
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
    // Every replica used to be created from the same template object, which
    // carries a fixed metadata.name — so the second pod collided with the
    // first and the whole create failed with AlreadyExists. Each pod gets its
    // own copy of the template and a generated name, the way a controller
    // names the pods it owns.
    let podTemplate = () => {
      let template = JSON.parse(JSON.stringify(this.spec.template));
      template.metadata = template.metadata || {};
      // Pod.create treats generateName as its own container-name prefix and
      // falls back to the literal name "default" when there is no name, so the
      // controller has to hand each replica a distinct name itself.
      template.metadata.name = `${this.metadata.name}-${randomBytes(3).toString('hex')}`;
      template.metadata.namespace = template.metadata.namespace || this.metadata.namespace;
      return template;
    };
    // `.fill(promise)` puts the *same* already-started promise in every slot,
    // so a replica count of N created exactly one pod. Each slot has to be its
    // own call.
    let arr = Array.from({ length: numPods ?? this.spec.replicas }, () =>
      Promise.all([
        Pod.create(podTemplate()),
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

  static async table (items = []) {
    return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${items.length}${JSON.stringify(items[0])}`)}`,
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
        "rows": items.map((e) => ({
          "cells": [
            e.metadata.name,
            age(e.metadata.creationTimestamp),
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
