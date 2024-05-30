const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const Pod = require('./pod.js');
const Service = require('./service.js');
const { IngressClass: Model, DNS } = require('../database/models.js');
const { duration } = require('../functions.js');

class IngressClass extends K8Object {
  constructor(config) {
    super(config);
    this.spec = config.spec;
    this.status = config.status;
    this.apiVersion = IngressClass.apiVersion;
    this.kind = IngressClass.kind;
    this.Model = IngressClass.Model;
  }

  static apiVersion = `networking.k8s.io/v1`;
  static kind = 'IngressClass';
  static Model = Model;

  static create(config) {
    return super.create(config)
    .then(async (ingressClass) => {
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
      return ingressClass;
    })
  }

  static async table (queryOptions = {}) {
    return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${ingressClasses.length}${JSON.stringify(ingressClasses[0])}`)}`,
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
            duration(DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "") - e.metadata.creationTimestamp),
            e.spec?.selector && Object.keys(e.spec.selector).length > 0 ? Object.entries(e.spec.selector).map((e) => `${e[0]}=${e[1]}`).join() : '<None>',
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

module.exports = IngressClass;
