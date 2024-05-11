const K8Object = require('./object.js');
const { Event: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class Event extends K8Object {
  constructor(config) {
    super(config);
    this.action = config.action;
    this.deprecatedCount = config.deprecatedCount;
    this.deprecatedFirstTimestamp = config.deprecatedFirstTimestamp;
    this.deprecatedLastTimestamp = config.deprecatedLastTimestamp;
    this.deprecatedSource = config.deprecatedSource;
    this.note = config.note;
    this.reason = config.reason;
    this.regarding = config.regarding;
    this.related = config.related;
    this.reportingController = config.reportingController;
    this.reportingInstance = config.reportingInstance;
    this.series = config.series;
    this.type = config.type;
  }

  static apiVersion = 'events.k8s.io/v1';
  static kind = 'Event';

  static findOne(params = {}, options = {}) {
    return Model.findOne(params, options)
      .then((event) => {
        if (event) {
          return new Event(event).setResourceVersion();
        }
      });
  }

  static find(params = {}, projection = {}, queryOptions = {}) {
    let options = {
      sort: { 'metadata.name': 1 },
      ...queryOptions
    };
    return Model.find(params, projection, options)
      .then((events) => {
        if (events) {
          return Promise.all(events.map((event) => new Event(event).setResourceVersion()));
        }
      });
  }

  static create(config) {
    return this.findOne({ 'metadata.name': cofig.metadata.name, 'metadata.namespace': cofig.metadata.namespace })
    .then((existingEvent) => {
      if (existingEvent) {
        throw this.alreadyExistsStatus(config.metadata.name);
      }
      return new Model(config).save();
    })
    .then((event) => new Event(event));
  }

  delete () {
    return Model.findOneAndDelete({ 'metadata.name': this.metadata.name, 'metadata.namespace': this.metadata.namespace })
    .then((event) => {
      if (event) {
        return this.setConfig(event);
      }
    });
  }

  static findAllSorted(queryOptions = {}, sortOptions = { 'created_at': 1 }) {
    let params = {
      'metadata.event': queryOptions.event ? queryOptions.event : undefined,
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
      .then(async (events) => ({
        apiVersion: this.apiVersion,
        kind: `${this.kind}List`,
        metadata: {
          continue: queryOptions?.limit < events.length ? "true" : undefined,
          remainingItemCount: queryOptions.limit && queryOptions.limit < events.length ? events.length - queryOptions.limit : 0,
          resourceVersion: `${await super.hash(`${events.length}${JSON.stringify(events[0])}`)}`
        },
        items: events
      }));
  }

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (events) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${events.length}${JSON.stringify(events[0])}`)}`,
        },
        "columnDefinitions": [
          {
            "name": "Name",
            "type": "string",
            "format": "name",
            "description": "Name must be unique within a event. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: http://kubernetes.io/docs/user-guide/identifiers#names",
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
        "rows": events.map((e) => ({
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
      { 'metadata.name': this.metadata.name, 'metadata.namespace': this.metadata.namespace },
      updateObj,
      {
        new: true,
        ...options,
      }
    )
    .then((event) => {
      if (event) {
        return this.setConfig(event);
      }
    });
  }

  async setResourceVersion() {
    await super.setResourceVersion();
    return this;
  }

  async setConfig(config) {
    await super.setResourceVersion();
    this.action = config.action;
    this.deprecatedCount = config.deprecatedCount;
    this.deprecatedFirstTimestamp = config.deprecatedFirstTimestamp;
    this.deprecatedLastTimestamp = config.deprecatedLastTimestamp;
    this.deprecatedSource = config.deprecatedSource;
    this.note = config.note;
    this.reason = config.reason;
    this.regarding = config.regarding;
    this.related = config.related;
    this.reportingController = config.reportingController;
    this.reportingInstance = config.reportingInstance;
    this.series = config.series;
    this.type = config.type;
    return this;
  }
}

module.exports = Event;
