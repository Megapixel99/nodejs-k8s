const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const Pod = require('./pod.js');
const { Endpoints: Model, DNS } = require('../database/models.js');
const {
  addPortsToEndpoints,
  addPortToEndpoints,
  addPodToEndpoints,
  removePortFromEndpoints,
  removePodFromEndpoints,
  pullImage,
  imageExists,
  buildImage,
  runImage,
  getContainerIP,
  duration,
  stopContainer,
  removeContainer,
} = require('../functions.js');

class Endpoints extends K8Object {
  constructor(config) {
    super(config);
    this.subsets = config.subsets;
  }

  static apiVersion = 'v1';
  static kind = 'Endpoints';

  static findOne(params) {
    return Model.findOne(params)
      .then((endpoints) => {
        if (endpoints) {
          return new Endpoints(endpoints).setResourceVersion();
        }
      });
  }

  static find(params) {
    return Model.find(params)
      .then((endpointses) => {
        if (endpointses) {
          return Promise.all(endpointses.map((endpoints) => new Endpoints(endpoints).setResourceVersion()));
        }
      });
  }

  static create(config) {
    return this.findOne({ 'metadata.name': config.metadata.name, 'metadata.namespace': config.metadata.namespace })
    .then((existingEndpoints) => {
      if (existingEndpoints) {
        throw this.alreadyExistsStatus(config.metadata.name);
      }
      return new Model(config).save()
    })
    .then((endpoints) => {
      let newEndpoints = new Endpoints(endpoints);
      return imageExists('loadbalancer')
        .catch((err) =>
          pullImage('node')
          .then(() => buildImage('loadbalancer', 'loadBalancer/Dockerfile'))
        )
        .then(() => {
          let options = {
            ports: newEndpoints.subsets.map((s) => s.ports.map((p) => `${p.port}:${p.port}`)),
            env: [{
              name: 'PORTS',
              value: config.ports,
            }, {
              name: 'DNS_SERVER',
              value: process.env.DNS_SERVER,
            }, {
              name: 'PODS',
              value: endpoints.subsets.map((e) => e.notReadyAddresses.map((a) => a.ip)).join(' '),
            }]
          };
          return runImage('loadbalancer', `${newEndpoints.metadata.name}-loadBalancer`, options)
        })
        .then(() => newEndpoints.listenForPods())
    });
  }

  stopLoadBalancer() {
    Promise.all(this.spec.containers.map((e) => {
      return stopContainer(this.metadata.generateName)
        .then(() => removeContainer(`${this.metadata.generateName}-${e.name}`));
    }));
  }

  getPods() {
    return this.subsets.map((s) => s.ports.map((p) => {
      return s.notReadyAddresses.map((a) => `${a}:${p}`);
    }).join(',')).join(';');
  }

  podEventHandler(pod) {
    let podEvents = pod.events();
    let readyMap = (podRef, i) => {
      let obj = {};
      obj[`subsets.${i}.addresses`] = podRef;
      return obj;
    }
    let notReadyMap = (podRef, i) => {
      let obj = {};
      obj[`subsets.${i}.notReadyAddresses`] = podRef;
      return obj;
    }
    podEvents.on('NewContainer', (podRef) => {
      this.update(
      null,
      {
        $push: this.subsets.map(notReadyMap),
      });
    });
    podEvents.on('Ready', (pod) => {
      this.update(
      null,
      {
        $push: this.subsets.map((s, i) => readyMap(
          s.notReadyAddresses.find((e) => e.ip === pod.status.podIP),
          i
        )),
        $pull: this.subsets.map((s, i) => notReadyMap(
          s.notReadyAddresses.find((e) => e.ip === pod.status.podIP),
          i
        )),
      });
      this.addPod(p.status.podIP);
    });
    podEvents.on('Delete', (pod) => {
      this.update(
      null,
      {
        $pull: this.subsets.map((s, i) => notReadyMap(
          s.addresses.find((e) => e.ip === pod.status.podIP),
          i
        )),
      });
      this.removePod(p.status.podIP);
    });
  }

  listenForPods() {
    return Pod.find({ 'metadata.name': this.metadata.name, 'metadata.namespace': this.metadata.namespace })
      .then((pods) => {
        pods.forEach(this.podEventHandler);
        return this;
      });
  }

  delete() {
    this.stopLoadBalancer();
    return Model.findOneAndDelete({ 'metadata.name': this.metadata.name, 'metadata.namespace': this.metadata.namespace })
    .then((endpoints) => {
      if (endpoints) {
        return this.setConfig(endpoints);
      }
    });
  }

  update(findObj = {}, updateObj = {}, options = {}) {
    return Model.findOneAndUpdate(
      {
        'metadata.name': this.metadata.name,
        'metadata.namespace': config.metadata.namespace,
        ...findObj,
      },
      updateObj,
      {
        new: true,
        ...options,
      }
    )
    .then((endpoints) => {
      if (endpoints) {
        return this.setConfig(endpoints);
      }
    });
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

  static findAllSorted(queryOptions = {}, sortOptions = { 'created_at': 1 }) {
    let params = {
      'metadata.namespace': queryOptions.namespace ? queryOptions.namespace : undefined,
      'metadata.resourceVersion': queryOptions.resourceVersionMatch ? queryOptions.resourceVersionMatch : undefined,
    };
    let projection = {};
    let options = {
      sort: sortOptions,
      limit: queryOptions.limit ? Number(queryOptions.limit) : undefined,
    };
    return this.find(params, projection, options);
  }

  static list (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (endpointses) => ({
        apiVersion: this.apiVersion,
        kind: `${this.kind}List`,
        metadata: {
          continue: queryOptions?.limit < endpointses.length ? "true" : undefined,
          remainingItemCount: queryOptions.limit && queryOptions.limit < endpointses.length ? endpointses.length - queryOptions.limit : 0,
          resourceVersion: `${await super.hash(`${endpointses.length}${JSON.stringify(endpointses[0])}`)}`
        },
        items: endpointses
      }));
  }

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (endpointses) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${endpointses.length}${JSON.stringify(endpointses[0])}`)}`,
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
            "name": "Subsets",
            "type": "string",
            "format": "name",
            "description": "The set of all endpoints is the union of all subsets. Addresses are placed into subsets according to the IPs they share. A single address with multiple ports, some of which are ready and some of which are not (because they come from different containers) will result in the address being displayed in different subsets for the different ports. No address will appear in both Addresses and NotReadyAddresses in the same subset. Sets of addresses and ports that comprise a service",
            "priority": 0
          }
        ],
        "rows": pods.map((e) => ({
          "cells": [
            e.metadata.name,
            (this.getPods() || '<None>'),
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
    this.subsets = config.subsets;
    return this;
  }

  async setResourceVersion() {
    await super.setResourceVersion();
    return this;
  }

  getSubsets() {
    return this.subsets;
  }

  removePod(pod) {
    return removePodFromEndpoints(`${this.metadata.name}-loadBalancer`, pod.status.podIP);
  }

  addPod(pod) {
    return addPodToEndpoints(`${this.metadata.name}-loadBalancer`, pod.status.podIP);
  }
}

module.exports = Endpoints;
