const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { Role: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class Role extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
  }

  static apiVersion = 'v1';
  static kind = 'Role';


  static findOne(params = {}, options = {}) {
    return Model.findOne(params, options)
      .then((role) => {
        if (role) {
          return new Role(role).setResourceVersion();
        }
      });
  }

  static find(params = {}, projection = {}, queryOptions = {}) {
    let options = {
      sort: { 'metadata.name': 1 },
      ...queryOptions
    };
    return Model.find(params, projection, options)
      .then((roles) => {
        if (roles) {
          return Promise.all(roles.map((role) => new Role(role).setResourceVersion()));
        }
      });
  }

  static create(config) {
    return this.findOne({ 'metadata.name': config.metadata.name, 'metadata.namespace': config.metadata.namespace })
    .then((existingRole) => {
      if (existingRole) {
        throw this.alreadyExistsStatus(config.metadata.name);
      }
      return new Model(config).save();
    })
    .then((role) => new Role(role));
  }

  delete () {
    return Model.findOneAndDelete({ 'metadata.name': this.metadata.name, 'metadata.namespace': this.metadata.namespace })
    .then((role) => {
      if (role) {
        return this.setConfig(role);
      }
    });
  }

  static findAllSorted(queryOptions = {}, sortOptions = { 'created_at': 1 }) {
    let params = {
      'metadata.role': queryOptions.role ? queryOptions.role : undefined,
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
      .then(async (roles) => ({
        apiVersion: this.apiVersion,
        kind: `${this.kind}List`,
        metadata: {
          continue: queryOptions?.limit < roles.length ? "true" : undefined,
          remainingItemCount: queryOptions.limit && queryOptions.limit < roles.length ? roles.length - queryOptions.limit : 0,
          resourceVersion: `${await super.hash(`${roles.length}${JSON.stringify(roles[0])}`)}`
        },
        items: roles
      }));
  }

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (roles) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${roles.length}${JSON.stringify(roles[0])}`)}`,
        },
        "columnDefinitions": [
          {
            "name": "Name",
            "type": "string",
            "format": "name",
            "description": "Name must be unique within a role. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: http://kubernetes.io/docs/user-guide/identifiers#names",
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
        "rows": roles.map((e) => ({
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
      { 'metadata.name': this.metadata.name, 'metadata.namespace': this.metadata.namespace },
      updateObj,
      {
        new: true,
        ...options,
      }
    )
    .then((role) => {
      if (role) {
        return this.setConfig(role);
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

module.exports = Role;
