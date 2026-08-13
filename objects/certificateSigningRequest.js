const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { CertificateSigningRequest: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class CertificateSigningRequest extends K8Object {
  constructor(config) {
        super(config);
    let _src = (config && typeof config.toObject === 'function') ? config.toObject() : (config || {});
    for (const key of Object.keys(_src)) {
      if (key === 'apiVersion' || key === 'kind' || key === 'metadata') continue;
      if (key === '_id' || key === '__v') continue;
      this[key] = _src[key];
    }
    this.apiVersion = CertificateSigningRequest.apiVersion;
    this.kind = CertificateSigningRequest.kind;
    this.Model = CertificateSigningRequest.Model;
  }

  static apiVersion = 'v1';
  static kind = 'CertificateSigningRequest';
  static Model = Model;


  static create(config) {
    let selfsigned = require('selfsigned');
    let pem = selfsigned.generate([{ name: 'commonName', value: config?.metadata?.name || 'csr' }], { days: 365 });
    config = { ...config, status: { certificate: Buffer.from(pem.cert).toString('base64'), conditions: [{ type: 'Approved', status: 'True', reason: 'simulated' }], ...(config.status || {}) } };
    return super.create(config);
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
            "description": "Name must be unique within a certificateSigningRequest. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: http://kubernetes.io/docs/user-guide/identifiers#names",
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
    let _src = (config && typeof config.toObject === 'function') ? config.toObject() : (config || {});
    for (const key of Object.keys(_src)) {
      if (key === 'apiVersion' || key === 'kind' || key === 'metadata') continue;
      if (key === '_id' || key === '__v') continue;
      this[key] = _src[key];
    }
    return this;
  }
}

module.exports = CertificateSigningRequest;
