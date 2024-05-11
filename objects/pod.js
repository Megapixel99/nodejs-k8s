const EventEmitter = require('events');
const K8Object = require('./object.js');
const Secret = require('./secret.js');
const ConfigMap = require('./configMap.js');
const { Pod: Model } = require('../database/models.js');
const {
  runImage,
  duration,
  stopContainer,
  getContainerIP,
  removeContainer,
  randomBytes,
  isContainerRunning,
} = require('../functions.js');

class Pod extends K8Object {
  constructor(config) {
    super(config);
    this.spec = config.spec;
    this.status = config.status;
    this.eventEmitter = new EventEmitter();
  }

  static apiVersion = 'v1';
  static kind = 'Pod';

  static findOne(params) {
    return Model.findOne(params)
      .then((pod) => {
        if (pod) {
          return new Pod(pod).setResourceVersion();
        }
      });
  }

  static find(params) {
    return Model.find(params)
      .then((pods) => {
        if (pods) {
          return Promise.all(pods.map((pod) => new Pod(pod).setResourceVersion()));
        }
      });
  }

  static async create(config) {
    let otherPod = undefined;
    do {
      config.metadata.generateName = `${config.metadata.name}-${randomBytes(6).toString('hex')}`;
      otherPod = await Pod.findOne({ 'metadata.generateName': config.metadata.generateName });
    } while (otherPod);
    if (!config?.metadata?.creationTimestamp) {
      config.metadata.creationTimestamp = new Date();
    }
    if (!config.status) {
      config.status = {};
    }
    if (!config.status.conditions) {
      config.status.conditions = [];
    }
    config.status.conditions.push({
      type: "Initialized",
      status: 'True',
      lastTransitionTime: new Date(),
    });
    return new Model(config).save()
    .then((pod) => {
      let newPod = new Pod(pod);
      return newPod.start()
      .then(async (podNames) => {
        return Promise.all(podNames.map((podName) => {
          return getContainerIP(podName)
            .then((data) => JSON.parse(data.raw)[0]?.NetworkSettings.Networks.bridge.IPAddress)
            .then((ip) => {
              newPod.eventEmitter.emit('NewContainer', {
                ip,
                nodeName: '',
                targetRef: {
                  kind: this.kind,
                  namespace: newPod.metadata.namespace,
                  name: podName,
                  uid: newPod.metadata.uid
                }
              });
              return [ip, podName];
            });
        }))
        .then(async (podsInfo) => {
          return Promise.all(podsInfo.map((podInfo) => {
            let [podIP, podName] = podInfo;
            return new Promise(function(resolve, reject) {
              let inter = setInterval(async () => {
                // console.log(podName);
                try {
                  if ((await isContainerRunning(podName)).object === true) {
                    clearInterval(inter);
                    newPod.eventEmitter.emit('ContainersReady', newPod);
                    newPod.update({
                      $push: {
                        'status.conditions': [{
                          type: "ContainersReady",
                          status: 'True',
                          lastTransitionTime: new Date(),
                        }]
                      }
                    })
                    .then(() => podInfo);
                  }
                } catch (e) {
                  reject(e);
                }
              }, 1000);
            });
          }));
        })
        .then((podsInfo) => {
          return Promise.all(podsInfo.map(async (podInfo) => {
            let [podIP, podName] = podInfo
            console.log(`Pod Name: ${podName}`);
            return; newPod.update({
              $push: {
                'status.containerStatuses': {
                  "restartCount": 0,
                  "started": true,
                  "ready": true,
                  "name": config.metadata.name,
                  "state": {
                    "running": {
                      "startedAt": new Date(),
                    }
                  },
                  "imageID": "",
                  "image": "",
                  "lastState": {},
                  "containerID": podName
                },
                'status.podIPs': {
                  ip: podIP
                },
              },
              $set: {
                'status.phase': 'Running',
                'status.podIP': podIP,
              }
            })
          }));
        })
        .then(() => {
          newPod.eventEmitter.emit('Ready', newPod);
          newPod.eventEmitter.emit('PodScheduled', newPod);
          return newPod.update({
            $push: {
              'status.conditions': [{
                type: "Ready",
                status: 'True',
                lastTransitionTime: new Date(),
              }, {
                type: "PodScheduled",
                status: 'True',
                lastTransitionTime: new Date(),
              }],
            }
          });
        });
      })
    })
  }

  events() {
    return this.eventEmitter;
  }

  async setConfig(config) {
    await super.setResourceVersion();
    this.spec = config.spec;
    this.status = config.status;
    return this;
  }

  async setResourceVersion() {
    await super.setResourceVersion();
    return this;
  }

  delete () {
    this.stop();
    return Model.findOneAndDelete({ 'metadata.name': this.metadata.name, 'metadata.namespace': this.metadata.namespace })
    .then((pod) => {
      if (pod) {
        this.eventEmitter.emit('Delete', pod);
        return this.setConfig(pod);
      }
    });
  }

  update(updateObj) {
    return Model.findOneAndUpdate(
      { 'metadata.name': this.metadata.name, 'metadata.namespace': this.metadata.namespace },
      updateObj,
      { new: true }
    )
    .then((pod) => {
      if (pod) {
        return this.setConfig(pod);
      }
    });
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
      .then(async (pods) => ({
        apiVersion: this.apiVersion,
        kind: `${this.kind}List`,
        metadata: {
          continue: false,
          remainingItemCount: queryOptions.limit && queryOptions.limit < pods.length ? pods.length - queryOptions.limit : 0,
          resourceVersion: `${await super.hash(`${pods.length}${JSON.stringify(pods[0])}`)}`
        },
        items: pods
      }));
  }

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (pods) => ({
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${pods.length}${JSON.stringify(pods[0])}`)}`,
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
            "name": "Ready",
            "type": "string",
            "format": "",
            "description": "Whether or not the pod is ready",
            "priority": 0
          },
          {
            "name": "Status",
            "type": "string",
            "format": "",
            "description": "Current status of the pod.",
            "priority": 0
          },
          {
            "name": "Restarts",
            "type": "string",
            "format": "",
            "description": "Number of restarts for the pod.",
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
            "name": "IP",
            "type": "string",
            "format": "",
            "description": "IP address of the pod.",
            "priority": 1
          },
          {
            "name": "Node",
            "type": "string",
            "format": "",
            "description": "Name of the node.",
            "priority": 1
          },
          {
            "name": "Nominated Node",
            "type": "string",
            "format": "",
            "description": "Name of the nominated node.",
            "priority": 1
          },
          {
            "name": "Readiness Gates",
            "type": "string",
            "format": "",
            "description": "Gate info.",
            "priority": 1
          }
        ],
        "rows": pods.map((e) => ({
          "cells": [
            e.metadata.name,
            `${e.status.phase === "Running" ? 1 : 0}/1`,
            e.status.phase,
            (e.status.containerStatuses.restartCount || 0),
            duration(new Date() - e.metadata.creationTimestamp),
            (e.status.podIP || '<None>'),
            (e.metadata.generateName || '<None>'),
            (e.status.nominatedNodeName || '<None>'),
            (e.spec.readinessGates.conditionType || '<None>'),
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

  stop() {
    Promise.all(this.spec.containers.map((e) => {
      return stopContainer(`${this.metadata.generateName}-${e.name}`)
        .catch((err) => {
          if (!err.stderr.includes('No such container') && !err.stderr.includes('No such object')) {
            throw err;
          }
        })
        .then(() => removeContainer(`${this.metadata.generateName}-${e.name}`))
        .catch((err) => {
          if (!err.stderr.includes('No such container') && !err.stderr.includes('No such object')) {
            throw err;
          }
        })
    }));
  }

  getEnvVarsFromSecret(secretName) {
    return Secret.findOne({ 'metadata.name': secretName, 'metadata.namespace': this.metadata.namespace })
      .then((secret) => (secret?.mapVariables() || []));
  }

  getEnvVarsFromConfigMaps(configNames) {
    return ConfigMap.find({
      'metadata.namespace': this.metadata.namespace,
      $or: configNames.map((e) => ({ 'metadata.name': e })),
     })
      .then((configMaps) => {
        if (configMaps) {
          return configMaps.map((e) => ({
            name: e.metadata.name,
            variables: e.mapVariables(),
          }));
        }
        return [];
      });
  }

  start() {
    let p = this.spec.containers.map(async (e) => {
      let options = {
        expose: e.ports.map((a) => a.containerPort),
      }
      if (e.env || e.envFrom) {
        options['env'] = [];
        if (e.env) {
          options['env'].push(...e.env.filter((v) => v?.value));
          if (e.env.find((v) => v?.valueFrom?.configMapKeyRef)) {
            let configMaps = (await this.getEnvVarsFromConfigMaps(
              e.env.map((v) => v.valueFrom.configMapKeyRef.name)
            ));
            e.env
              .filter((v) => v.valueFrom?.configMapKeyRef)
              .forEach((e) => {
                let value = configMaps
                  ?.find((v) => v.name === e.valueFrom.configMapKeyRef.name)
                  ?.variables
                  ?.find((v) => v.name === e.valueFrom.configMapKeyRef.key)
                  ?.value
                  if (value) {
                    options['env'].push({
                      name: e.name,
                      value,
                    });
                  }
              });
          }
        }
        if (e.envFrom) {
          await Promise.all(e.envFrom.map(async (a) => {
            if (e.secretRef) {
              return this.getEnvVarsFromSecret(a.secretRef.name);
            }
            return null;
          }))
          .then((variables) => variables.flat().filter((a) => a))
          .then((variables) => options['env'].push(...variables));
        }
      }
      if (this.spec.containers.length > 1) {
        await runImage(e.image, `${this.metadata.generateName}-${e.name}`, options);
        return `${this.metadata.generateName}-${e.name}`;
      }
      await runImage(e.image, this.metadata.generateName, options);
      return this.metadata.generateName;
    });
    return Promise.all(p);
  }

  getSpec() {
    return this.spec;
  }

  getStatus() {
    return this.status;
  }
}

module.exports = Pod;
