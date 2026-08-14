const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const { Node: Model } = require('../database/models.js');
const Namespace = require('./namespace.js');
const Deployment = require('./deployment.js');
const Service = require('./service.js');
const { duration, isContainerRunning, age } = require('../functions.js');

class Node extends K8Object {
  constructor(config) {
    super(config);
    this.spec = config.spec;
    this.status = config.status;
    this.apiVersion = Node.apiVersion;
    this.kind = Node.kind;
    this.Model = Node.Model;
  }

  static apiVersion = 'v1';
  static kind = 'Node';
  static Model = Model;

  static create(config) {
    let now = DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "");
    config.status.allocatable = config.status.capacity;
    config.status.phase = 'Running';
    config.status.conditions = [
      { type: "MemoryPressure", status: "False", lastHeartbeatTime: now, lastTransitionTime: now, reason: "KubeletHasSufficientMemory", message: "kubelet has sufficient memory available" },
      { type: "DiskPressure", status: "False", lastHeartbeatTime: now, lastTransitionTime: now, reason: "KubeletHasNoDiskPressure", message: "kubelet has no disk pressure" },
      { type: "PIDPressure", status: "False", lastHeartbeatTime: now, lastTransitionTime: now, reason: "KubeletHasSufficientPID", message: "kubelet has sufficient PID available" },
      { type: "NetworkUnavailable", status: "False", lastHeartbeatTime: now, lastTransitionTime: now, reason: "RouteCreated", message: "sim network ready" },
      { type: "Ready", status: "True", lastHeartbeatTime: now, lastTransitionTime: now, reason: "KubeletReady", message: "kubelet is posting ready status" },
    ];
    if (!config.status.nodeInfo) {
      config.status.nodeInfo = { kubeletVersion: 'v1.29.0', osImage: 'sim', operatingSystem: 'linux', architecture: 'amd64', containerRuntimeVersion: 'docker://29.0.0' };
    }
    return super.create(config, { 'metadata.name': config.metadata.name })
    .then((node) => new Node(node))
    .then(async (node) => {
      let createNamespace = (name) => Namespace.create({ metadata: { name } });
      Promise.all([
        Namespace.findOne({ 'metadata.name': 'kube-system' })
          .then((ns) => ns ? Promise.resolve() : createNamespace('kube-system'))
          .catch(() => {}),
        Namespace.findOne({ 'metadata.name': 'default' })
          .then((ns) => ns ? Promise.resolve() : createNamespace('default'))
          .catch(() => {}),
        Namespace.findOne({ 'metadata.name': 'kube-public' })
          .then((ns) => ns ? Promise.resolve() : createNamespace('kube-public'))
          .catch(() => {}),
        Namespace.findOne({ 'metadata.name': 'kube-node-lease' })
          .then((ns) => ns ? Promise.resolve() : createNamespace('kube-node-lease'))
          .catch(() => {}),
      ]).then(async () => {
        // Seed the `kubernetes` service directly in the DB, bypassing
        // Service.create (which spawns a loadbalancer container we don't need
        // for a sim). The e2e framework reads .spec.clusterIP on BeforeSuite.
        let existing = await Service.Model.findOne({ 'metadata.name': 'kubernetes', 'metadata.namespace': 'default' }).catch(() => null);
        if (!existing) {
          await new Service.Model({
            apiVersion: 'v1',
            kind: 'Service',
            metadata: { name: 'kubernetes', namespace: 'default', labels: { 'component': 'apiserver', 'provider': 'kubernetes' } },
            spec: {
              clusterIP: '10.0.0.1',
              clusterIPs: ['10.0.0.1'],
              type: 'ClusterIP',
              ports: [{ name: 'https', port: 443, protocol: 'TCP', targetPort: 8443 }],
              selector: {},
              sessionAffinity: 'None',
              ipFamilies: ['IPv4'],
              ipFamilyPolicy: 'SingleStack',
              internalTrafficPolicy: 'Cluster',
            },
          }).save({ validateBeforeSave: false }).catch((err) => {
            console.warn('[node setup] kubernetes service seed failed:', err?.message || err);
          });
        }
      }).catch((err) => {
        console.warn('[node setup] background namespace setup failed:', err?.message || err);
      });
      return node;
    });
  }

  delete () {
    return Model.findOneAndDelete({ 'metadata.name': this.metadata.name })
    .then(async (node) => {
      let nodes = await Model.find({});
      if (nodes.length === 0) {
        await Promise.all((await Namespace.find({})).map((namespace) => namespace.delete()))
      }
      if (node) {
        return this.setConfig(node);
      }
    });
  }

  async setConfig(config) {
    await super.setResourceVersion();
    this.spec = config.spec;
    this.status = config.status;
    return this;
  }

  static async table (items = []) {
    return {
      "kind": "Table",
      "apiVersion": "meta.k8s.io/v1",
      "metadata": {
        "resourceVersion": `${await super.hash(`${items.length}${JSON.stringify(items[0])}`)}`,
      },
      "columnDefinitions": [
        { "name": "Name", "type": "string", "format": "name", "description": "Name of the node", "priority": 0 },
        { "name": "Status", "type": "string", "format": "", "description": "Node status", "priority": 0 },
        { "name": "Roles", "type": "string", "format": "", "description": "Node roles", "priority": 0 },
        { "name": "Age", "type": "string", "format": "", "description": "Creation timestamp", "priority": 0 },
        { "name": "Version", "type": "string", "format": "", "description": "Kubelet version", "priority": 0 },
      ],
      "rows": items.map((e) => ({
        "cells": [
          e.metadata?.name,
          (e.status?.conditions?.find((c) => c.type === 'Ready')?.status === 'True') ? 'Ready' : 'NotReady',
          '<none>',
          age(e.metadata.creationTimestamp),
          e.status?.nodeInfo?.kubeletVersion || 'v1.29.0',
        ],
        object: {
          "kind": "PartialObjectMetadata",
          "apiVersion": "meta.k8s.io/v1",
          metadata: e.metadata,
        }
      })),
    };
  }
}

module.exports = Node;
