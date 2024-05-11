const K8Object = require('./object.js');
const Pod = require('./pod.js');
const Service = require('./service.js');
const { ServiceAccount: Model, DNS } = require('../database/models.js');
const { duration } = require('../functions.js');

class ServiceAccount extends K8Object {
  constructor(config) {
    super(config);
    this.spec = config.spec;
    this.status = config.status;
  }

  static apiVersion = `v1`;
  static kind = 'ServiceAccount';

  static findOne(params) {
    return Model.findOne(params)
      .then((serviceAccount) => {
        if (serviceAccount) {
          return new ServiceAccount(serviceAccount).setResourceVersion();
        }
      });
  }

  static find(params) {
    return Model.find(params)
      .then((serviceAccounts) => {
        if (serviceAccounts) {
          return Promise.all(serviceAccounts.map((serviceAccount) => new ServiceAccount(serviceAccount).setResourceVersion()));
        }
      });
  }

  static create(config) {
    return this.findOne({ 'metadata.name': config.metadata.name, 'metadata.namespace': config.metadata.namespace })
    .then((existingServiceAccount) => {
      if (existingServiceAccount) {
        throw new Error(this.alreadyExistsStatus(config.metadata.name, this.kind));
      }
      return new Model(config).save()
    })
  }

  delete () {
    return Model.findOneAndDelete({ 'metadata.name': this.metadata.name, 'metadata.namespace': this.metadata.namespace })
    .then((serviceAccount) => {
      if (serviceAccount) {
        return this.setConfig(serviceAccount);
      }
    });
  }

  update(updateObj) {
    return Model.findOneAndUpdate(
      { 'metadata.name': this.metadata.name, 'metadata.namespace': this.metadata.namespace },
      updateObj,
      { new: true }
    )
    .then((serviceAccount) => {
      if (serviceAccount) {
        return this.setConfig(serviceAccount);
      }
    });
  }

  static findAllSorted(queryOptions = {}, sortOptions = { 'created_at': 1 }) {
    let params = {
      'metadata.namespace': queryOptions.namespace ? queryOptions.namespace : undefined,
      'metadata.resourceVersion': queryOptions.resourceVersionMatch ? queryOptions.resourceVersionMatch : undefined,
    };
    let projection = {};
    let options = {
      sort: sortOptions,
      limit: queryOptions.limit ? Number(queryOptions.limit) : undefined,
    };
    return this.find(params, projection, options);
  }

  static list (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (serviceAccounts) => ({
        apiVersion: this.apiVersion,
        kind: `${this.kind}List`,
        metadata: {
          continue: queryOptions?.limit < serviceAccounts.length ? "true" : undefined,
          remainingItemCount: queryOptions.limit && queryOptions.limit < serviceAccounts.length ? serviceAccounts.length - queryOptions.limit : 0,
          resourceVersion: `${await super.hash(`${serviceAccounts.length}${JSON.stringify(serviceAccounts[0])}`)}`
        },
        items: serviceAccounts
      }));
  }

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (serviceAccounts) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${serviceAccounts.length}${JSON.stringify(serviceAccounts[0])}`)}`,
        },
        "columnDefinitions": [
          {
            "name": "Name",
            "type": "string",
            "format": "name",
            "description": "Name must be unique within a namespace. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: http://kubernetes.io/docs/user-guide/identifiers#names",
            "priority": 0
          },
          {
            "name": "Type",
            "type": "string",
            "format": "name",
            "description": "Type of service.",
            "priority": 0
          },
          {
            "name": "Cluster-ip",
            "type": "string",
            "format": "",
            "description": "IP within the cluster.",
            "priority": 0
          },
          {
            "name": "External-ip",
            "type": "string",
            "format": "",
            "description": "IP outside the cluster.",
            "priority": 0
          },
          {
            "name": "Port(s)",
            "type": "string",
            "format": "",
            "description": "Port(s) exposed by the service, for the pod(s).",
            "priority": 0
          },
          {
            "name": "Age",
            "type": "string",
            "format": "",
            "description": "CreationTimestamp is a timestamp representing the server time when this object was created. It is not guaranteed to be set in happens-before order across separate operations. Clients may not set this value. It is represented in RFC3339 form and is in UTC.\n\nPopulated by the system. Read-only. Null for lists. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata",
            "priority": 0
          },
          {
            "name": "Selector",
            "type": "string",
            "format": "",
            "description": "Which pod(s) are fronted by the service.",
            "priority": 1
          }
        ],
        "rows": pods.map((e) => ({
          "cells": [
            e.metadata.name,
            e.spec.type,
            (e.spec.clusterIP || e.spec.clusterIPs?.join() || '<None>'),
            (e.spec.externalIPs?.join() || '<None>'),
            e.spec?.ports?.length > 0 ? e.spec.ports.map((e) => `${e.port}/${e.protocol}`).join() : '<None>',
            duration(new Date() - e.metadata.creationTimestamp),
            e.spec?.selector && Object.keys(e.spec.selector).length > 0 ? Object.entries(e.spec.selector).map((e) => `${e[0]}=${e[1]}`).join() : '<None>',
          ],
          object: {
            "kind": "PartialObjectMetadata",
            "apiVersion": "meta.k8s.io/v1",
            metadata: e.metadata,
          }
        })),
      }));
  }

  static notFoundStatus(objectName = undefined) {
    return super.notFoundStatus(this.kind, objectName, this.kind);
  }

  static forbiddenStatus(objectName = undefined) {
    return super.forbiddenStatus(this.kind, objectName, this.kind);
  }

  static alreadyExistsStatus(objectName = undefined) {
    return super.alreadyExistsStatus(this.kind, objectName);
  }

  static unprocessableContentStatus(objectName = undefined, message = undefined) {
    return super.unprocessableContentStatus(this.kind, objectName, this.kind, message);
  }

  async setConfig(config) {
    await super.setResourceVersion();
    this.spec = config.spec;
    this.status = config.status;
    return this;
  }

  async setResourceVersion() {
    await super.setResourceVersion();
    return this;
  }

  getSpec() {
    return this.spec;
  }

  getStatus() {
    return this.status;
  }
}

module.exports = ServiceAccount;
