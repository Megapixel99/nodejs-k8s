const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { EndpointSlice: Model } = require('../database/models.js');
const { duration, age } = require('../functions.js');

class EndpointSlice extends K8Object {
  constructor(config) {
        super(config);
    let _src = (config && typeof config.toObject === 'function') ? config.toObject() : (config || {});
    for (const key of Object.keys(_src)) {
      if (key === 'apiVersion' || key === 'kind' || key === 'metadata') continue;
      if (key === '_id' || key === '__v') continue;
      this[key] = _src[key];
    }
    this.apiVersion = EndpointSlice.apiVersion;
    this.kind = EndpointSlice.kind;
    this.Model = EndpointSlice.Model;
  }

  static apiVersion = 'discovery.k8s.io/v1';
  static kind = 'EndpointSlice';
  static Model = Model;

  static async table (items = []) {
    return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${items.length}${JSON.stringify(items[0])}`)}`,
        },
        // `kubectl get endpointslices` prints NAME/ADDRESSTYPE/PORTS/ENDPOINTS
        // /AGE. Name and age alone made every slice look identical in a list.
        "columnDefinitions": [
          {
            "name": "Name",
            "type": "string",
            "format": "name",
            "description": "Name must be unique within a namespace.",
            "priority": 0
          },
          {
            "name": "AddressType",
            "type": "string",
            "description": "addressType specifies the type of address carried by this EndpointSlice.",
            "priority": 0
          },
          {
            "name": "Ports",
            "type": "string",
            "description": "ports specifies the list of network ports exposed by each endpoint in this slice.",
            "priority": 0
          },
          {
            "name": "Endpoints",
            "type": "string",
            "description": "endpoints is a list of unique endpoints in this slice.",
            "priority": 0
          },
          {
            "name": "Age",
            "type": "string",
            "description": "CreationTimestamp is a timestamp representing the server time when this object was created.",
            "priority": 0
          }
        ],
        "rows": items.map((e) => ({
          "cells": [
            e.metadata.name,
            e.addressType || '<unset>',
            ((e.ports || []).map((p) => p.port).join(',') || '<unset>'),
            // kubectl lists the addresses themselves, and prints "<unset>"
            // rather than an empty cell when a slice has no endpoints.
            ((e.endpoints || []).flatMap((endpoint) => endpoint.addresses || []).join(',') || '<unset>'),
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
    let _src = (config && typeof config.toObject === 'function') ? config.toObject() : (config || {});
    for (const key of Object.keys(_src)) {
      if (key === 'apiVersion' || key === 'kind' || key === 'metadata') continue;
      if (key === '_id' || key === '__v') continue;
      this[key] = _src[key];
    }
    return this;
  }
}

module.exports = EndpointSlice;
