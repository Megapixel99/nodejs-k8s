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
    this.apiVersion = Endpoints.apiVersion;
    this.kind = Endpoints.kind;
    this.Model = Endpoints.Model;
  }

  static apiVersion = 'networking.k8s.io/v1';
  static kind = 'Endpoints';
  static Model = Model;

  static create(config) {
    return super.create(config)
    .then((endpoints) => {
      let newEndpoints = new Endpoints(endpoints);
      return imageExists('loadbalancer')
        .catch((err) =>
          pullImage('node')
          .then(() => buildImage('loadbalancer', 'loadBalancer/Dockerfile'))
        )
        .then(async () => {
          let options = {
            ports: newEndpoints.subsets.map((s) => s.ports.map((p) => `${p.port}:${p.port}`)).flat(),
            env: [{
              name: 'PORTS',
              value: config.ports,
            }, {
              name: 'PODS',
              value: endpoints.subsets.map((e) => e.notReadyAddresses.map((a) => a.ip)).join(' '),
            }]
          };
          let dnsPod = await Pod.findOne({ 'metadata.name': 'core-dns' });
          if (dnsPod) {
            options.env.push({
              name: 'DNS_SERVER',
              value: await getContainerIP(dnsPod.metadata.generateName),
            })
          }
          return runImage('loadbalancer', `${newEndpoints.metadata.name}-${newEndpoints.metadata.namespace}-loadBalancer`, options)
        })
        .then(() => newEndpoints.listenForPods())
        .then(() => {
          return newEndpoints.toJSON();
        })
    });
  }

  stopLoadBalancer() {
    return stopContainer(`${this.metadata.name}-${this.metadata.namespace}-loadBalancer`)
      .then(() => removeContainer(`${this.metadata.name}-${this.metadata.namespace}-loadBalancer`));
  }

  delete() {
    return Promise.all([
      this.stopLoadBalancer(),
      super.delete()
    ]);
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

  static async table (queryOptions = {}) {
    return {
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
    }
  }

  async setConfig(config) {
    await super.setResourceVersion();
    this.subsets = config.subsets;
    return this;
  }

  getSubsets() {
    return this.subsets;
  }

  removePod(pod) {
    return removePodFromEndpoint(`${this.metadata.generateName}-${this.metadata.namespace}-loadBalancer`, pod.status.podIP);
  }

  addPod(pod) {
    return addPodToEndpoint(`${this.metadata.generateName}-${this.metadata.namespace}-loadBalancer`, pod.status.podIP);
  }

  removePort(port) {
    return removePortFromEndpoint(`${this.metadata.generateName}-${this.metadata.namespace}-loadBalancer`, port);
  }

  addPorts(ports) {
    return addPortsToEndpoint(`${this.metadata.generateName}-${this.metadata.namespace}-loadBalancer`, ports);
  }

  addPort(port) {
    return addPortToEndpoint(`${this.metadata.generateName}-${this.metadata.namespace}-loadBalancer`, port);
  }
}

module.exports = Endpoints;
