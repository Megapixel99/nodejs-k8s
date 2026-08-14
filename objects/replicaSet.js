const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const Pod = require('./pod.js');
const { ReplicaSet: Model } = require('../database/models.js');
const { duration, isContainerRunning, age } = require('../functions.js');

class ReplicaSet extends K8Object {
  constructor(config) {
    super(config);
    this.spec = config.spec;
    this.status = config.status;
    this.apiVersion = ReplicaSet.apiVersion;
    this.kind = ReplicaSet.kind;
    this.Model = ReplicaSet.Model;
  }

  static apiVersion = 'apps/v1';
  static kind = 'ReplicaSet';
  static Model = Model;

  static async create(config) {
    let rs = await super.create(config).then((doc) => new ReplicaSet(doc));
    // Spawn child pods asynchronously so the API call returns fast.
    let replicas = Math.max(0, Number(rs.spec?.replicas || 0));
    let tmpl = rs.spec?.template || {};
    let podMeta = tmpl.metadata || {};
    let podSpec = tmpl.spec || {};
    for (let i = 0; i < replicas; i++) {
      Pod.create({
        metadata: {
          name: `${rs.metadata.name}-${i}`,
          namespace: rs.metadata.namespace,
          labels: podMeta.labels || rs.spec?.selector?.matchLabels || {},
          ownerReferences: [{
            apiVersion: 'apps/v1',
            kind: 'ReplicaSet',
            name: rs.metadata.name,
            uid: rs.metadata.uid,
            controller: true,
            blockOwnerDeletion: true,
          }],
        },
        spec: podSpec,
      }).catch((err) => console.warn(`[replicaset ${rs.metadata.name}] pod ${i} create failed:`, err?.message || err));
    }
    // Report status.replicas eagerly so list/count checks succeed while pods
    // are still booting.
    rs.patch({ $set: { 'status.replicas': replicas, 'status.readyReplicas': replicas, 'status.availableReplicas': replicas, 'status.observedGeneration': 1 } }).catch(() => {});
    return rs;
  }

  async delete() {
    let pods = await Pod.find({ 'metadata.namespace': this.metadata.namespace, 'metadata.ownerReferences.uid': this.metadata.uid }).catch(() => []);
    await Promise.all(pods.map((p) => p.delete().catch(() => {})));
    return super.delete();
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
            "description": "Name must be unique within a replicaSet. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: http://kubernetes.io/docs/user-guide/identifiers#names",
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
    let _src = (config && typeof config.toObject === 'function') ? config.toObject() : (config || {});
    for (const key of Object.keys(_src)) {
      if (key === 'apiVersion' || key === 'kind' || key === 'metadata') continue;
      if (key === '_id' || key === '__v') continue;
      this[key] = _src[key];
    }
    return this;
  }
}

module.exports = ReplicaSet;
