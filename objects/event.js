const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { Event: Model } = require('../database/models.js');
const {
  duration,
  randomBytes
} = require('../functions.js');

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
    this.apiVersion = Event.apiVersion;
    this.kind = Event.kind;
    this.Model = Event.Model;
  }

  static apiVersion = 'events.k8s.io/v1';
  static kind = 'Event';
  static Model = Model;

  static async create(config) {
    let otherEvent = undefined;
    let genName = config.metadata.generateName;
    do {
      config.metadata.generateName = `${genName}.${randomBytes(10).toString('hex')}`;
      otherEvent = await Event.findOne({ 'metadata.generateName': config.metadata.generateName });
    } while (otherEvent);
    return new Model(config).save()
      .then((e) => new Event(e));
  }

  static async table (queryOptions = {}) {
    return {
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
