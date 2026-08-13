const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { Event: Model } = require('../database/models.js');
const { duration, randomBytes, age } = require('../functions.js');

// These are served on /api/v1, so the response has to carry the core/v1 field
// names. Storage and the internal emitters speak events.k8s.io/v1, so fill the
// core/v1 side from its counterpart whenever it wasn't written explicitly —
// otherwise the fields are absent, and the protobuf encoder (which only knows
// the core/v1 message) drops the whole event without erroring.
// A nested path that was never written comes back from mongoose as an object
// whose keys all hold undefined, so neither `??` nor an Object.keys check sees
// it as absent. Serializing is what actually collapses it to `{}`.
function unset(value) {
  if (value === undefined || value === null || value === '') {
    return true;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value) === '{}';
  }
  return false;
}

function withCoreV1Fields(config, target) {
  let from = (core, deprecated) => (unset(core) ? deprecated : core);
  target.involvedObject = from(config.involvedObject, config.regarding);
  target.message = from(config.message, config.note);
  target.source = from(config.source, config.deprecatedSource);
  target.firstTimestamp = from(config.firstTimestamp, config.deprecatedFirstTimestamp);
  target.lastTimestamp = from(config.lastTimestamp, config.deprecatedLastTimestamp);
  target.eventTime = from(config.eventTime, target.metadata?.creationTimestamp);
  target.count = from(config.count, config.deprecatedCount);
  target.reportingComponent = from(config.reportingComponent, config.reportingController);
  return target;
}

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
    withCoreV1Fields(config, this);
    this.apiVersion = Event.apiVersion;
    this.kind = Event.kind;
    this.Model = Event.Model;
  }

  static apiVersion = 'v1';
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

  static async table (items = []) {
    return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${items.length}${JSON.stringify(items[0])}`)}`,
        },
        // Name and Age only: `kubectl get events` showed a list of opaque
        // event names and nothing about what happened. These are the columns
        // kubectl's own event printer uses.
        "columnDefinitions": [
          {
            "name": "Last Seen",
            "type": "string",
            "format": "",
            "description": "The time at which the most recent occurrence of this event was recorded.",
            "priority": 0
          },
          {
            "name": "Type",
            "type": "string",
            "format": "",
            "description": "Type of this event (Normal, Warning).",
            "priority": 0
          },
          {
            "name": "Reason",
            "type": "string",
            "format": "",
            "description": "A short, machine understandable string that gives the reason for this event.",
            "priority": 0
          },
          {
            "name": "Object",
            "type": "string",
            "format": "",
            "description": "The object this event is about.",
            "priority": 0
          },
          {
            "name": "Message",
            "type": "string",
            "format": "",
            "description": "A human-readable description of the status of this operation.",
            "priority": 0
          },
          {
            "name": "Name",
            "type": "string",
            "format": "name",
            "description": "Name must be unique within a namespace.",
            "priority": 1
          },
        ],
        "rows": items.map((e) => {
          let about = e.involvedObject || e.regarding || {};
          return {
            "cells": [
              age(e.lastTimestamp || e.deprecatedLastTimestamp || e.eventTime || e.metadata.creationTimestamp),
              e.type || 'Normal',
              e.reason || '<none>',
              about.kind ? `${`${about.kind}`.toLowerCase()}/${about.name || ''}` : '<none>',
              e.message || e.note || '',
              e.metadata.name,
            ],
            object: {
              "kind": "PartialObjectMetadata",
              "apiVersion": "meta.k8s.io/v1",
              metadata: e.metadata,
            }
        };
        }),
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
    withCoreV1Fields(config, this);
    return this;
  }
}

module.exports = Event;
