const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { Secret: Model } = require('../database/models.js');
const { duration, countEntries, age } = require('../functions.js');

function convertData(data) {
  const base64RegExp = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;
  const isBase64 = (str) => typeof str === 'string' && base64RegExp.test(str);
  let obj = {};
  Object.entries(data || {}).forEach(([key, value]) => {
    if (value == null) return;
    if (typeof value === 'string') {
      obj[key] = isBase64(value) ? value : Buffer.from(value).toString('base64');
      return;
    }
    if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
      obj[key] = Buffer.from(value).toString('base64');
      return;
    }
    // Protobuf bytes sometimes decode as an Object keyed by index; coerce.
    if (typeof value === 'object') {
      let arr = Object.values(value).filter((n) => typeof n === 'number');
      if (arr.length > 0) {
        obj[key] = Buffer.from(arr).toString('base64');
        return;
      }
      // Last resort: stringify.
      obj[key] = Buffer.from(String(value)).toString('base64');
      return;
    }
    obj[key] = Buffer.from(String(value)).toString('base64');
  });
  return obj;
}

// Merge stringData into data (base64), with stringData winning on conflicts,
// the way the apiserver does. Returns a copy; stringData is not stored.
function foldStringData(config) {
  if (!config?.stringData || Object.keys(config.stringData).length === 0) {
    return config;
  }
  let encoded = {};
  Object.entries(config.stringData).forEach(([key, value]) => {
    encoded[key] = Buffer.from(`${value}`).toString('base64');
  });
  let out = { ...config, data: { ...(config.data || {}), ...encoded } };
  delete out.stringData;
  return out;
}

class Secret extends K8Object {
  constructor(config) {
    super(config);
    this.immutable = config.immutable;
    this.stringData = config.stringData;
    this.data = config.data;
    this.type = config.type;
    this.apiVersion = Secret.apiVersion;
    this.kind = Secret.kind;
    this.Model = Secret.Model;
  }

  static apiVersion = 'v1';
  static kind = 'Secret';
  static Model = Model;

  static create(config) {
    return this.findOne({ 'metadata.name': config.metadata.name, 'metadata.namespace': config.metadata.namespace })
    .then((existingSecret) => {
      if (existingSecret) {
        throw K8Object.alreadyExistsStatus(config.metadata.name);
      }
      if (config.data) {
        let invalidKey = Object.keys(config.data).find((k) => !k.match(/[-._a-zA-Z0-9]+/g))
        if (invalidKey !== undefined) {
          let err = `Error "Invalid value: "${invalidKey}": a valid config key must consist of alphanumeric characters, '-', '_' or '.' (e.g. 'key.name',  or 'KEY_NAME',  or 'key-name', regex used for validation is '[-._a-zA-Z0-9]+')" for field "data[${invalidKey}]".`;
          throw K8Object.unprocessableContentStatus(config?.kind, config?.metadata?.name, null, err, 'Invalid');
        }
        config.data = convertData(config.data);
      }
      if (!config.type) {
        config.type = 'Opaque';
      }
      // stringData is write-only in Kubernetes: the server base64s it into
      // `data` and never stores or returns it. Keeping it verbatim meant a
      // Secret written the way most manifests write one came back with no
      // `data` at all, so anything mounting or env-injecting it got nothing.
      config = foldStringData(config);
      return super.create(config)
        .then((s) => new Secret(s));
    });
  }

  update(updateObj, searchQ) {
    updateObj = foldStringData(updateObj);
    if (this.immutable === true) {
      let diff = null;
      if (this.immutable !== updateObj.immutable) {
        diff = 'immutable';
      }
      if (JSON.stringify(this.data) !== JSON.stringify(convertData(updateObj.data))) {
        diff = 'data';
      }
      if (JSON.stringify(this.stringData) !== JSON.stringify(updateObj.stringData)) {
        diff = 'metadata';
      }
      if (this.type !== updateObj.type) {
        diff = 'type';
      }
      if (this.kind !== updateObj.kind) {
        diff = 'kind';
      }
      if (this.apiVersion !== updateObj.apiVersion) {
        diff = 'apiVersion';
      }
      if (diff !== null) {
        let err = `Secret "${this.metadata.name}" is invalid: data: Forbidden: field is immutable when \`${diff}\` is set`;
        throw K8Object.unprocessableContentStatus(this.kind, this.metadata.name, null, err, 'Invalid');
      }
    }
    if (!searchQ) {
      searchQ = { 'metadata.name': this.metadata.name, 'metadata.namespace': this.metadata.namespace };
    }
    return super.delete(searchQ)
    .then(() => Secret.create(updateObj))
    .then((secret) => {
      if (secret) {
        super.events().emit('updated');
        return secret;
      }
    });
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
            "description": "Name must be unique within a namespace. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: http://kubernetes.io/docs/user-guide/identifiers#names",
            "priority": 0
          },
          {
            "name": "Type",
            "type": "string",
            "format": "",
            "description": "The type of secret",
            "priority": 0
          },
          {
            "name": "Data",
            "type": "string",
            "format": "",
            "description": "Number of items in the secret",
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
            e.type,
            countEntries(e.data),
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

  patch(updateObj, searchQ, options = {}) {
    if (updateObj && updateObj.stringData) {
      updateObj = foldStringData(updateObj);
    }
    if (updateObj && updateObj.$set?.stringData) {
      let folded = foldStringData({ data: updateObj.$set.data, stringData: updateObj.$set.stringData });
      updateObj = { ...updateObj, $set: { ...updateObj.$set, data: folded.data } };
      delete updateObj.$set.stringData;
    }
    if (updateObj && updateObj.data) {
      updateObj = { ...updateObj, data: convertData(updateObj.data) };
    }
    if (updateObj && updateObj.$set && updateObj.$set.data) {
      updateObj = { ...updateObj, $set: { ...updateObj.$set, data: convertData(updateObj.$set.data) } };
    }
    return super.patch(updateObj, searchQ, options);
  }

  mapVariables() {
    const toEntries = (x) => {
      if (!x) return [];
      if (x instanceof Map) return [...x.entries()];
      return Object.entries(x);
    };
    return toEntries(this.data).map(([name, value]) => ({
      name,
      value: Buffer.from(value, 'base64').toString('utf8'),
    }));
  }
}

module.exports = Secret;
