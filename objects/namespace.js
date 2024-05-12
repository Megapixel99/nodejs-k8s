const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { Namespace: Model } = require('../database/models.js');
const Models = require('../database/models.js');
const Pod = require('./pod.js');
const Endpoints = require('./endpoints.js');
const { duration } = require('../functions.js');

delete Models.Namespace;
delete Models.Pod;
delete Models.Endpoints;

class Namespace extends K8Object {
  constructor(config) {
    super(config);
    this.spec = config.spec;
    this.status = config.status;
  }

  static apiVersion = 'v1';
  static kind = 'Namespace';


  static findOne(params = {}, options = {}) {
    return Model.findOne(params, options)
      .then((namespace) => {
        if (namespace) {
          return new Namespace(namespace).setResourceVersion();
        }
      });
  }

  static find(params = {}, options = {}) {
    return Model.find(params, options)
      .then((namespaces) => {
        if (namespaces) {
          return Promise.all(namespaces.map((namespace) => new Namespace(namespace).setResourceVersion()));
        }
      });
  }

  static create(config) {
    return this.findOne({ 'metadata.name': config.metadata.name })
    .then((existingNamespace) => {
      if (existingNamespace) {
        throw this.alreadyExistsStatus(config.metadata.name);
      }
      return new Model(config).save();
    })
    .then((namespace) => new Namespace(namespace));
  }

  async delete () {
    return Promise.all([
      Pod.find({ 'metadata.namespace': this.metadata.name }),
      Endpoints.find({ 'metadata.namespace': this.metadata.name }),
    ])
    .then((data) => {
      let [ pods, endpoints ] = data;
      pods.map((p) => p.delete());
      endpoints.map((e) => e.delete());
      return [
        ...Object.keys(Models).map((m) => Models[m].findOneAndDelete({ 'metadata.namespace': this.metadata.name })),
        Model.findOneAndDelete({ 'metadata.name': this.metadata.name }),
      ];
    })
    .then((arr) => Promise.all(arr))
    .then((promises) => {
      let namespace = promises.at(-1);
      if (namespace) {
        return this.setConfig(namespace);
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
      .then(async (namespaces) => ({
        apiVersion: this.apiVersion,
        kind: `${this.kind}List`,
        metadata: {
          continue: queryOptions?.limit < namespaces.length ? "true" : undefined,
          remainingItemCount: queryOptions.limit && queryOptions.limit < namespaces.length ? namespaces.length - queryOptions.limit : 0,
          resourceVersion: `${await super.hash(`${namespaces.length}${JSON.stringify(namespaces[0])}`)}`
        },
        items: namespaces
      }));
  }

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (namespaces) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${namespaces.length}${JSON.stringify(namespaces[0])}`)}`,
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
            "name": "Age",
            "type": "string",
            "format": "",
            "description": "CreationTimestamp is a timestamp representing the server time when this object was created. It is not guaranteed to be set in happens-before order across separate operations. Clients may not set this value. It is represented in RFC3339 form and is in UTC.\n\nPopulated by the system. Read-only. Null for lists. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata",
            "priority": 0
          },
        ],
        "rows": namespaces.map((e) => ({
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
      }));
  }

  static notFoundStatus(objectName = undefined) {
    return super.notFoundStatus(this.kind, objectName);
  }

  static forbiddenStatus(objectName = undefined) {
    return super.forbiddenStatus(this.kind, objectName);
  }

  static alreadyExistsStatus(objectName = undefined) {
    return super.alreadyExistsStatus(this.kind, objectName);
  }

  static unprocessableContentStatus(objectName = undefined, message = undefined) {
    return super.unprocessableContentStatus(this.kind, objectName, undefined, message);
  }

  update(updateObj, options = {}) {
    return Model.findOneAndUpdate(
      { 'metadata.name': this.metadata.name },
      updateObj,
      {
        new: true,
        ...options,
      }
    )
    .then((namespace) => {
      if (namespace) {
        return this.setConfig(namespace);
      }
    });
  }

  async setResourceVersion() {
    await super.setResourceVersion();
    return this;
  }

  async setConfig(config) {
    await super.setResourceVersion();
    this.data = config.data;
    return this;
  }
}

module.exports = Namespace;
