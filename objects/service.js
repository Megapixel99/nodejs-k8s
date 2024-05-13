const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const Pod = require('./pod.js');
const Endpoints = require('./endpoints.js');
const { Service: Model, DNS } = require('../database/models.js');
const {
  addPortsToService,
  addPortToService,
  addPodToService,
  removePortFromService,
  removePodFromService,
  pullImage,
  imageExists,
  buildImage,
  runImage,
  getContainerIP,
  duration,
} = require('../functions.js');

class Service extends K8Object {
  constructor(config) {
    super(config);
    this.spec = config.spec;
    this.status = config.status;
    this.endpoints = null;
    this.apiVersion = Service.apiVersion;
    this.kind = Service.kind;
    this.Model = Service.Model;
  }

  static apiVersion = 'v1';
  static kind = 'Service';
  static Model = Model;

  static findOne(params) {
    return Model.findOne(params)
      .then((service) => {
        if (service) {
          Endpoints.findOne(params)
          .then((endpoints) => {
            return new Service({
              ...service,
              endpoints,
            }).setResourceVersion();
          })
        }
      });
  }

  static find(params) {
    return Model.find(params)
      .then((services) => {
        if (services) {
          return Endpoints.find(params)
          .then((endpoints) => {
            return Promise.all(services.map((service) => {
              service.endpoints = endpoints.filter((e) => e.metadata.name === service.metadata.name);
              let s = new Service(service);
              s.setResourceVersion();
              return s;
            }));
          })
        }
      });
  }

  convertToSubsets(pods) {
    let mappedIPs = []
    return [{
      notReadyAddresses: pods.map((p) => {
        return p.status.podIPs.map((podIP) => {
          if (!mappedIPs.includes(podIP.ip)) {
            mappedIPs.push(podIP.ip)
            return {
              ip: podIP.ip,
              nodeName: '',
              targetRef: {
                kind: 'Pod',
                namespace: this.metadata.namespace,
                name: p.metadata.generateName,
                uid: p.metadata.uid,
              }
            };
          }
        })
      }).flat().filter((e) => e),
      ports: this.spec.ports.map((p) => ({
        name: p.name,
        port: p.targetPort,
        protocol: p.protocol,
      }))
    }];
  }

  static create(config) {
    return this.findOne({ 'metadata.name': config.metadata.name, 'metadata.namespace': config.metadata.namespace })
    .then((existingService) => {
      if (existingService) {
        throw this.alreadyExistsStatus(config.metadata.name);
      }
      if (existingEndpoint) {
        throw Endpoints.alreadyExistsStatus(config.metadata.name);
      }
      return new Model(config).save()
    })
    .then((service) => {
      let newService = new Service(service);
      return Pod.find({ 'metadata.name': config.metadata.name, 'metadata.namespace': config.metadata.namespace })
        .then((pods) => {
          Endpoints.findOne({ 'metadata.name': config.metadata.name, 'metadata.namespace': config.metadata.namespace })
            .then(async (existingEndpoint) => {
              let endpoints = existingEndpoint;
              if (!endpoints) {
                endpoints = (await Endpoints.create({
                  metadata: newService.metadata,
                  subsets: newService.convertToSubsets(pods),
                  ports: newService.spec.ports.map((e) => `${e.port}:${e.targetPort}`).join(' '),
                }));
              }
              newService.endpoints = endpoints;
              return getContainerIP(`${newService.endpoints.metadata.name}-loadBalancer`)
              .then((ipInfo) => JSON.parse(ipInfo?.raw)[0]?.NetworkSettings?.Networks?.bridge?.IPAddress)
              .then((serviceIP) => {
                if (serviceIP) {
                  return newService.update({
                    $set: {
                      'spec.clusterIP': serviceIP,
                      'spec.clusterIPs': [serviceIP],
                    }
                  });
                }
              })
              .then(async () => {
                await new DNS({
                  name: `${newService.metadata.name}.${newService.metadata.namespace}.cluster.local`,
                  type: 'A',
                  class: 'IN',
                  ttl: 300,
                  address: newService.spec.clusterIP,
                }).save()
                return newService;
              });
            })
        })
    });
  }

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (services) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${services.length}${JSON.stringify(services[0])}`)}`,
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
        "rows": services.map((e) => ({
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
      }));
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

  removePort(port) {
    return removePortFromService(`${this.endpoints.metadata.generateName}-loadBalancer`, port);
  }

  addPorts(ports) {
    return addPortsToService(`${this.endpoints.metadata.generateName}-loadBalancer`, ports);
  }

  addPort(port) {
    return addPortToService(`${this.endpoints.metadata.generateName}-loadBalancer`, port);
  }

  async findOldestPod() {
    return (await Pod.findAllSorted({ 'metadata.name': this.metadata.name, 'metadata.namespace': this.metadata.namespace })).at(-1);
  }

  removePod(pod) {
    return this.endpoints.removePod(pod);
  }

  addPod(pod) {
    return this.endpoints.addPod(pod);
  }
}

module.exports = Service;
