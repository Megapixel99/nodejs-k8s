const K8Object = require('./object.js');
const Pod = require('./pod.js');
const Service = require('./service.js');
const { Ingress: Model, DNS } = require('../database/models.js');
const { duration } = require('../functions.js');

class Ingress extends K8Object {
  constructor(config) {
    super(config);
    this.spec = config.spec;
    this.status = config.status;
  }

  static apiVersion = 'networking.k8s.io/v1';
  static kind = 'Ingress';

  static findOne(params) {
    return Model.findOne(params)
      .then((ingress) => {
        if (ingress) {
          return new Ingress(ingress);
        }
      });
  }

  static find(params) {
    return Model.find(params)
      .then((ingresses) => {
        if (ingresses) {
          return ingresses.map((ingress) => new Ingress(ingress));
        }
      });
  }

  static create(config) {
    return this.findOne({ 'metadata.name': config.metadata.name })
    .then((existingIngress) => {
      if (existingIngress) {
        throw new Error(`Ingress ${config.metadata.name} already exists`);
      }
      return new Model(config).save()
    })
    .then(async (ingress) => {
      await Promise.all(
        req.body.spec.rules.map((rule) => {
          return rule.http.paths.map((path) => {
            return Service.findOne({ 'metadata.name': path.backend.serviceName })
              .then((service) => {
                let arr = []
                if (service?.externalIPs?.length > 0) {
                  arr.push(
                    ...service.externalIPs.map((e) => {
                      new DNS({
                        name: rule.host,
                        type: 'A',
                        class: 'IN',
                        ttl: 300,
                        address: e,
                      }).save()
                    })
                  );
                }
              })
          })
          .flat()
          .filter((e) => e);
        }));
      return ingress;
    })
  }

  delete () {
    return Model.findOneAndDelete({ 'metadata.name': this.metadata.name, 'metadata.namespace': config.metadata.namespace })
    .then((ingress) => {
      if (ingress) {
        return this.setConfig(ingress);
      }
    });
  }

  update(updateObj) {
    return Model.findOneAndUpdate(
      { 'metadata.name': this.metadata.name, 'metadata.namespace': config.metadata.namespace },
      updateObj,
      { new: true }
    )
    .then((ingress) => {
      if (ingress) {
        return this.setConfig(ingress);
      }
    });
  }

  static findAllSorted(queryOptions = {}, sortOptions = { 'created_at': 1 }) {
    let params = {
      'metadata.namespace': queryOptions.namespace ? queryOptions.namespace : undefined,
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
      .then(async (ingresses) => ({
        apiVersion: this.apiVersion,
        kind: `${this.kind}List`,
        metadata: {
          continue: false,
          remainingItemCount: queryOptions.limit && queryOptions.limit < ingresses.length ? ingresses.length - queryOptions.limit : 0,
          resourceVersion: `${await super.hash(`${ingresses.length}${JSON.stringify(ingresses[0])}`)}`
        },
        items: ingresses
      }));
  }

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (ingresses) => ({
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
            "description": "Name must be unique within a namespace. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: http://kubernetes.io/docs/user-guide/identifiers#names",
            "priority": 0
          },
          {
            "name": "Type",
            "type": "string",
            "format": "name",
            "description": "Type of service.",
            "priority": 0
          },
          {
            "name": "Cluster-ip",
            "type": "string",
            "format": "",
            "description": "IP within the cluster.",
            "priority": 0
          },
          {
            "name": "External-ip",
            "type": "string",
            "format": "",
            "description": "IP outside the cluster.",
            "priority": 0
          },
          {
            "name": "Port(s)",
            "type": "string",
            "format": "",
            "description": "Port(s) exposed by the service, for the pod(s).",
            "priority": 0
          },
          {
            "name": "Age",
            "type": "string",
            "format": "",
            "description": "CreationTimestamp is a timestamp representing the server time when this object was created. It is not guaranteed to be set in happens-before order across separate operations. Clients may not set this value. It is represented in RFC3339 form and is in UTC.\n\nPopulated by the system. Read-only. Null for lists. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata",
            "priority": 0
          },
          {
            "name": "Selector",
            "type": "string",
            "format": "",
            "description": "Which pod(s) are fronted by the service.",
            "priority": 1
          }
        ],
        "rows": pods.map((e) => ({
          "cells": [
            e.metadata.name,
            e.spec.type,
            (e.spec.clusterIP || e.spec.clusterIPs?.join() || '<None>'),
            (e.spec.externalIPs?.join() || '<None>'),
            e.spec?.ports?.length > 0 ? e.spec.ports.map((e) => `${e.port}/${e.protocol}`).join() : '<None>',
            duration(new Date() - e.metadata.creationTimestamp),
            e.spec?.selector && Object.keys(e.spec.selector).length > 0 ? Object.entries(e.spec.selector).map((e) => `${e[0]}=${e[1]}`).join() : '<None>',
          ],
          object: {
            "kind": "PartialObjectMetadata",
            "apiVersion": "meta.k8s.io/v1",
            metadata: e.metadata,
          }
        })),
      }));
  }

  setConfig(config) {
    this.spec = config.spec;
    this.status = config.status;
    return this;
  }

  getSpec() {
    return this.spec;
  }

  getStatus() {
    return this.status;
  }
}

module.exports = Ingress;
