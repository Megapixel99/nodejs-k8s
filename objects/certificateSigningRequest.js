const K8Object = require('./object.js');
const { CertificateSigningRequest: Model } = require('../database/models.js');
const { duration } = require('../functions.js');

class CertificateSigningRequest extends K8Object {
  constructor(config) {
    super(config);
    this.rules = config.rules;
  }

  static apiVersion = 'v1';
  static kind = 'CertificateSigningRequest';


  static findOne(params = {}, options = {}) {
    return Model.findOne(params, options)
      .then((certificateSigningRequest) => {
        if (certificateSigningRequest) {
          return new CertificateSigningRequest(certificateSigningRequest).setResourceVersion();
        }
      });
  }

  static find(params = {}, projection = {}, queryOptions = {}) {
    let options = {
      sort: { 'metadata.name': 1 },
      ...queryOptions
    };
    return Model.find(params, projection, options)
      .then((certificateSigningRequests) => {
        if (certificateSigningRequests) {
          return Promise.all(certificateSigningRequests.map((certificateSigningRequest) => new CertificateSigningRequest(certificateSigningRequest).setResourceVersion()));
        }
      });
  }

  static create(config) {
    return this.findOne({ 'metadata.name': this.metadata.name })
    .then((existingRole) => {
      if (existingRole) {
        throw this.alreadyExistsStatus(config.metadata.name);
      }
      return new Model(config).save();
    })
    .then((certificateSigningRequest) => new CertificateSigningRequest(certificateSigningRequest));
  }

  delete () {
    return Model.findOneAndDelete({ 'metadata.name': this.metadata.name, 'metadata.namespace': this.metadata.namespace })
    .then((certificateSigningRequest) => {
      if (certificateSigningRequest) {
        return this.setConfig(certificateSigningRequest);
      }
    });
  }

  static findAllSorted(queryOptions = {}, sortOptions = { 'created_at': 1 }) {
    let params = {
      'metadata.certificateSigningRequest': queryOptions.certificateSigningRequest ? queryOptions.certificateSigningRequest : undefined,
      'metadata.resourceVersion': queryOptions.resourceVersionMatch ? queryOptions.resourceVersionMatch : undefined,
    };
    if (!([...new Set(Object.values(params))].find((e) => undefined))) {
      params = {};
    }
    let projection = {};
    let options = {
      sort: sortOptions,
      limit: queryOptions.limit ? Number(queryOptions.limit) : undefined,
    };
    return this.find(params, projection, options);
  }

  static list (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (certificateSigningRequests) => ({
        apiVersion: this.apiVersion,
        kind: `${this.kind}List`,
        metadata: {
          continue: false,
          remainingItemCount: queryOptions.limit && queryOptions.limit < certificateSigningRequests.length ? certificateSigningRequests.length - queryOptions.limit : 0,
          resourceVersion: `${await super.hash(`${certificateSigningRequests.length}${JSON.stringify(certificateSigningRequests[0])}`)}`
        },
        items: certificateSigningRequests
      }));
  }

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (certificateSigningRequests) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${configMaps.length}${JSON.stringify(configMaps[0])}`)}`,
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
        "rows": certificateSigningRequests.map((e) => ({
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
    .then((certificateSigningRequest) => {
      if (certificateSigningRequest) {
        return this.setConfig(certificateSigningRequest);
      }
    });
  }

  async setConfig(config) {
    await super.setResourceVersion();
    this.data = config.data;
    return this;
  }
}

module.exports = CertificateSigningRequest;
