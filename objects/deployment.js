const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const ReplicationController = require('./replicationController.js');
const Service = require('./service.js');
const { Deployment: Model } = require('../database/models.js');
const {
  runImage,
  getContainerIP,
  getAllContainersWithName,
  duration,
}  = require('../functions.js');

class Deployment extends K8Object {
  constructor(config) {
    super(config);
    this.spec = config.spec;
    this.status = config.status;
    this.apiVersion = Deployment.apiVersion;
    this.kind = Deployment.kind;
    this.Model = Deployment.Model;
  }

  static apiVersion = 'apps/v1';
  static kind = 'Deployment';
  static Model = Model;

  static create(config) {
    return super.create(config)
    .then((deployment) => {
      let newDeployment = new Deployment(deployment);
      if (newDeployment.spec.paused !== true) {
        newDeployment.rollout();
      }
      setInterval(() => {
        if (newDeployment.rollingOut === false && newDeployment.spec.paused !== true) {
          Promise.all(
            newDeployment.spec.template.spec.containers
              .map((e) => getAllContainersWithName(newDeployment.spec.template.metadata.name, e.image))
          )
          .then((containers) => containers.map((e) => e.raw))
          .then((raw) => raw.toString().split('\n').filter((e) => e !== ''))
          .then((arr) => {
            return ReplicationController.create({
              metadata: {
                ...newDeployment.metadata,
                name: `${newDeployment.metadata.name}-1`
              },
              spec: {
                ...newDeployment.spec,
                selector: {
                  app: newDeployment.metadata.name,
                  deployment: `${newDeployment.metadata.name}-1`,
                },
                minReadySeconds: Infinity,
              },
            });
          })
          .then(() => newDeployment.rollout());
        }
      }, 1000);
      return newDeployment;
    })
  }

  update(updateObj, searchQ) {
    return Promise.all([
      super.patch(updateObj, searchQ),
      ReplicationController.find(
        { 'metadata.name': { $regex: `^${this.metadata.name}` } , 'metadata.namespace': this.metadata.namespace },
        { sort: { 'created_at': 1 } }
      )
    ])
    .then(async (arr) => {
      let [ deployment, rc ] = arr;
      if (deployment) {
        let newDeployment = this.setConfig(deployment);
        if (newDeployment.spec.paused !== true) {
          await ReplicationController.create({
            metadata: {
              ...newDeployment.metadata,
              name: `${newDeployment.metadata.name}-${rc.length + 1}`
            },
            spec: {
              ...newDeployment.spec,
              selector: {
                app: newDeployment.metadata.name,
                deployment: `${newDeployment.metadata.name}-${rc.length + 1}`,
              },
              minReadySeconds: Infinity,
            },
          });
          newDeployment.rollout();
        }
        return newDeployment;
      }
    });
  }

  delete() {
    return ReplicationController.find({ 'metadata.name': { $regex: `^${this.metadata.name}` } , 'metadata.namespace': this.metadata.namespace })
    .then((rcs) => {
      return Promise.all([
        ...rcs.map((rc) => rc.delete()),
        super.delete(),
      ]);
    });
  }

  static async table (queryOptions = {}) {
    return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${deployments.length}${JSON.stringify(deployments[0])}`)}`,
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
            "description": "Number of the pod with ready state",
            "priority": 0
          },
          {
            "name": "Up-to-date",
            "type": "string",
            "format": "",
            "description": "Total number of non-terminated pods targeted by this deployment that have the desired template spec.",
            "priority": 0
          },
          {
            "name": "Available",
            "type": "string",
            "format": "",
            "description": "Total number of available pods (ready for at least minReadySeconds) targeted by this deployment.",
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
            "name": "Containers",
            "type": "string",
            "format": "",
            "description": "Names of each container in the template.",
            "priority": 1
          },
          {
            "name": "Images",
            "type": "string",
            "format": "",
            "description": "Images referenced by each container in the template.",
            "priority": 1
          },
          {
            "name": "Selector",
            "type": "string",
            "format": "",
            "description": "Label selector for pods. Existing ReplicaSets whose pods are selected by this will be the ones affected by this deployment.",
            "priority": 1
          }
        ],
        "rows": deployments.map((e) => ({
          "cells": [
            e.metadata.name,
            `${e.status.availableReplicas}/${e.spec.replicas}`,
            e.status.updatedReplicas,
            e.status.availableReplicas,
            duration(DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "") - e.metadata.creationTimestamp),
            e.spec.template.spec.containers.map((e) => e.name).join(', '),
            e.spec.template.spec.containers.map((e) => e.image).join(', '),
            Object.values(e.spec.selector.matchLabels).join(', '),
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

  async rollout() {
    let rc = (await ReplicationController.findAllSorted({ 'metadata.name': this.spec.metadata.name }))[0];
    if (this.spec.strategy.type === "RollingUpdate") {
      let percent = Number(`${this.spec.strategy.rollingUpdate.maxUnavailable}`.match(/\d*/)[0]);;
      let newPods = 0;
      do {
        await Promise.all(
          new Array(Math.ceil(numPods * percent / 100))
          .fill(0)
          .map(() => {
            newPods += 1;
            this.patch({
              $set: {
                'conditions.$.type': "Progressing",
                'conditions.$.status': "True",
                'conditions.$.lastUpdateTime': DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ""),
                'conditions.$.lastTransitionTime': DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ""),
              }
            }, {
              'conditions.type': 'Progressing',
              'metadata.name': this.metadata.name,
              'metadata.namespace': this.metadata.namespace
            })
            return rc.createPods(1)
            .then((pods) => {
              return Promise.all([
                this.patch({
                  $inc: {
                    'status.replicas': 1,
                    'status.readyReplicas': 1,
                    'status.availableReplicas': 1,
                  },
                  $set: {
                    'conditions.$.type': "Available",
                    'conditions.$.status': "True",
                    'conditions.$.lastUpdateTime': DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ""),
                    'conditions.$.lastTransitionTime': DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ""),
                  }
                }, {
                  'conditions.type': 'Available',
                  'metadata.name': this.metadata.name,
                  'metadata.namespace': this.metadata.namespace
                }),
                Service.findOne({ 'metadata.name': this.metadata.name, 'metadata.namespace': this.metadata.namespace })
                .then((service) => {
                  if (service) {
                    return service.addPod(pods[0]);
                  }
                })
              ])
            })
            .then(() => rc.deletePods(1))
            .then(() => {
              return Promise.all([
                this.patch({
                  $inc: {
                    'status.replicas': -1,
                    'status.readyReplicas': -1,
                    'status.availableReplicas': -1,
                  },
                }),
                Service.findOldestPod()
                .then((service) => {
                  if (service) {
                    return service.removePod();
                  }
                })
              ])
            })
          })
        );
      } while (this.status.replicas < numPods);
    } else if (this.spec.strategy.type === "Recreate") {
      return Promise.all(rc.deletePods())
      .then(() => Promise.all(rc.createPods()));
    }
  }
}

module.exports = Deployment;
