const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const Pod = require('./pod.js');
const Service = require('./service.js');
const { IngressClass: Model, DNS } = require('../database/models.js');
const { duration, age } = require('../functions.js');

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
      // `req` was never in scope here, so every create threw a ReferenceError
      // and 500'd. The rules walk is an Ingress shape — an IngressClass spec
      // only carries `controller` — so read it off the config and no-op when
      // it isn't there rather than assuming it always is.
      await Promise.all(
        (config?.spec?.rules ?? []).map((rule) => {
          return (rule.http?.paths ?? []).map((path) => {
            return Service.findOne({ 'metadata.name': path.backend?.serviceName })
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
        }).flat());
      // Every other model's create resolves the object, not its JSON; the
      // middleware calls toJSON itself.
      return ingressClass;
    })
  }

  static async table (items = []) {
    return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${items.length}${JSON.stringify(items[0])}`)}`,
        },
        // These were the Service columns, copied wholesale: `kubectl get
        // ingressclasses` printed TYPE / CLUSTER-IP / EXTERNAL-IP / PORT(S)
        // against an object that has none of those fields. An IngressClass
        // shows its controller and parameters.
        "columnDefinitions": [
          {
            "name": "Name",
            "type": "string",
            "format": "name",
            "description": "Name must be unique within a namespace. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: http://kubernetes.io/docs/user-guide/identifiers#names",
            "priority": 0
          },
          {
            "name": "Controller",
            "type": "string",
            "format": "",
            "description": "Controller refers to the name of the controller that should handle this class.",
            "priority": 0
          },
          {
            "name": "Parameters",
            "type": "string",
            "format": "",
            "description": "Parameters is a link to a custom resource containing additional configuration for the controller.",
            "priority": 0
          },
          {
            "name": "Age",
            "type": "string",
            "format": "",
            "description": "CreationTimestamp is a timestamp representing the server time when this object was created. It is not guaranteed to be set in happens-before order across separate operations. Clients may not set this value. It is represented in RFC3339 form and is in UTC.\n\nPopulated by the system. Read-only. Null for lists. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata",
            "priority": 0
          }
        ],
        "rows": items.map((e) => ({
          "cells": [
            e.metadata.name,
            e.spec?.controller || '<none>',
            e.spec?.parameters?.name ? `${e.spec.parameters.kind || 'Resource'}/${e.spec.parameters.name}` : '<none>',
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
