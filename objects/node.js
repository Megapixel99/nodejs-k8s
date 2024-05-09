const K8Object = require('./object.js');
const { Node: Model } = require('../database/models.js');
const {
  duration,
  isContainerRunning,
} = require('../functions.js');

class Node extends K8Object {
  constructor(config) {
    super(config);
    this.spec = config.spec;
    this.status = config.status;
  }

  static apiVersion = 'v1';
  static kind = 'Node';

  static findOne(params = {}, options = {}) {
    return Model.findOne(params, options)
      .then((node) => {
        if (node) {
          return new Node(node).setResourceVersion();
        }
      });
  }

  static find(params = {}, projection = {}, queryOptions = {}) {
    let options = {
      sort: { 'metadata.name': 1 },
      ...queryOptions
    };
    return Model.find(params, projection, options)
      .then((nodes) => {
        if (nodes.length > 0) {
          return Promise.all(nodes.map((node) => {
            return new Node(node).setResourceVersion();
          }))
        }
        return nodes;
      });
  }

  static create(config) {
    return this.findOne({ 'metadata.name': config.metadata.name })
    .then((existingNode) => {
      if (existingNode) {
        throw this.alreadyExistsStatus(config.metadata.name);
      }
      return new Model(config).save();
    })
    .then((node) => new Node(node));
  }

  delete () {
    return Model.findOneAndDelete({ 'metadata.name': this.metadata.name })
    .then((node) => {
      if (node) {
        return this.setConfig(node);
      }
    });
  }

  static findAllSorted(queryOptions = {}, sortOptions = { 'created_at': 1 }) {
    let params = {};
    let projection = {};
    if (queryOptions.node) {
      params['metadata.node'] = queryOptions.node;
    }
    if (queryOptions.resourceVersionMatch) {
      params['metadata.resourceVersion'] = queryOptions.resourceVersionMatch;
    }
    if (queryOptions.fieldSelector) {
      if ('true' === queryOptions.fieldSelector?.split('=')[1]) {
        projection[queryOptions.fieldSelector.split('=')[0]] = 1;
      } else if ('false' === queryOptions.fieldSelector?.split('=')[1]) {
        projection[queryOptions.fieldSelector.split('=')[0]] = 0;
      }
    }
    let options = { sort: sortOptions };
    if (queryOptions.limit) {
      options.limit = Number(queryOptions.limit);
    }
    return this.find(params, projection, options);
  }

  static list (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (nodes) => ({
        apiVersion: this.apiVersion,
        kind: `${this.kind}List`,
        metadata: {
          continue: queryOptions?.limit < nodes.length ? "true" : undefined,
          remainingItemCount: queryOptions?.limit < nodes.length ? nodes.length - queryOptions.limit : 0,
          resourceVersion: `${await super.hash(`${nodes.length}${JSON.stringify(nodes[0])}`)}`
        },
        items: nodes
      }));
  }

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (nodes) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${nodes.length}${JSON.stringify(nodes[0])}`)}`,
        },
        "columnDefinitions": [
          {
            "name": "Name",
            "type": "string",
            "format": "name",
            "description": "Name must be unique within a node. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: http://kubernetes.io/docs/user-guide/identifiers#names",
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
        "rows": nodes.map((e) => ({
          "cells": [
            e.metadata.name,
            duration(new Date() - e.metadata.creationTimestamp),
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
    .then((node) => {
      if (node) {
        return this.setConfig(node);
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

module.exports = Node;
