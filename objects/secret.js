const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { Secret: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

function convertData(data) {
  const base64RegExp = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;
  const isBase64 = (str) => base64RegExp.test(str);
  let obj = {};
  Object.entries(data).forEach(([key, value]) => {
    if (isBase64(value)) {
      obj[key] = value;
      return;
    }
    obj[key] = Buffer.from(value).toString('base64');
  });
  return obj;
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
        config.data = convertData(config.data);
      }
      if (!config.type) {
        config.type = 'Opaque';
      }
      return super.create(config);
    });
  }

  update(updateObj, searchQ) {
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

  static async table (queryOptions = {}) {
    return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${secrets.length}${JSON.stringify(secrets[0])}`)}`,
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
        "rows": secrets.map((e) => ({
          "cells": [
            e.metadata.name,
            e.type,
            e.data.length,
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
    this.data = config.data;
    return this;
  }
}

module.exports = Secret;
