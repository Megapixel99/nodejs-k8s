const K8Object = require('./object.js');
const Pod = require('./pod.js');
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
    this.rollingOut = false;
  }

  static apiVersion = 'v1';
  static kind = 'Deployment';

  static findOne(params) {
    return Model.findOne(params)
      .then((deployment) => {
        if (deployment) {
          return new Deployment(deployment);
        }
      });
  }

  static find(params) {
    return Model.find(params)
      .then((deployments) => {
        if (deployments) {
          return deployments.map((deployment) => new Deployment(deployment));
        }
      });
  }

  static create(config) {
    return this.findOne({ 'metadata.name': config.metadata.name })
    .then((existingDeployment) => {
      if (existingDeployment) {
        throw this.alreadyExistsStatus(config.metadata.name);
      }
      return new Model(config).save()
    })
    .then((deployment) => {
      let newDeployment = new Deployment(deployment);
      if (newDeployment.spec.paused !== true) {
        newDeployment.rollout();
      }
      setInterval(() => {
        if (newDeployment.rollingOut === false) {
          Promise.all(
            newDeployment.spec.template.spec.containers
              .map((e) => getAllContainersWithName(newDeployment.spec.template.metadata.name, e.image))
          )
          .then((containers) => containers.map((e) => e.raw))
          .then((raw) => raw.toString().split('\n').filter((e) => e !== ''))
          .then((arr) => {
            if (newDeployment.rollingOut === false) {
              if (newDeployment.spec.replicas > arr.length) {
                newDeployment.rollout(newDeployment.spec.replicas - arr.length);
              } else if (newDeployment.spec.replicas < arr.length) {
                new Array(arr.length - newDeployment.spec.replicas)
                  .fill(0).forEach(() => newDeployment.deletePod());
              }
            }
          })
        }
      }, 1000);
      return newDeployment;
    })
  }

  delete () {
    return Model.findOneAndDelete({ 'metadata.name': this.metadata.name, 'metadata.namespace': config.metadata.namespace })
    .then((deployment) => {
      if (deployment) {
        return this.setConfig(deployment);
      }
    });
  }

  update(updateObj) {
    return Model.findOneAndUpdate(
      { 'metadata.name': this.metadata.name, 'metadata.namespace': config.metadata.namespace },
      updateObj,
      { new: true }
    )
    .then((deployment) => {
      if (deployment) {
        let newDeployment = this.setConfig(deployment);
        if (newDeployment.spec.paused !== true &&
          this.rollingOut === false &&
          JSON.stringify(this.spec.template) !== JSON.stringify(deployment.spec.template)) {
          newDeployment.rollout();
        }
        return newDeployment;
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
      .then(async (deployments) => ({
        apiVersion: this.apiVersion,
        kind: `${this.kind}List`,
        metadata: {
          continue: false,
          remainingItemCount: queryOptions.limit && queryOptions.limit < deployments.length ? deployments.length - queryOptions.limit : 0,
          resourceVersion: `${await super.hash(`${deployments.length}${JSON.stringify(deployments[0])}`)}`
        },
        items: deployments
      }));
  }

  static table (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then(async (deployments) => ({
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
            duration(new Date() - e.metadata.creationTimestamp),
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

  deletePod() {
    return Pod.find(
      { 'metadata.name': this.spec.template.metadata.name },
      {},
      {
        sort: {
          'created_at': 1
        }
      }
    )
    .then((pods) => {
      if (pods[0]) {
        return Promise.all([
          pods[0].stop(),
          pods[0].delete(),
          Service.findOne({
            'metadata.name': this.metadata.name
          })
          .then((service) => {
            if (service) {
              service.removePod(pod[0].status.podIP)
            }
          })
        ])
        .then(() => {
          this.update({
            $inc: {
              'status.readyReplicas': -1,
              'status.replicas': -1,
              'status.availableReplicas': -1,
            },
          })
        })
      }
    })
  }

  async createPod(config) {
    if (!config?.metadata?.labels) {
      config.metadata.labels = new Map();
    }
    config.metadata.labels.set('app', this.metadata.name);
    if (!config?.metadata?.namespace) {
      config.metadata.namespace = this.metadata.namespace
    }
    return Pod.create(config)
    .then((newPod) => {
      return Promise.all([
        this.update({
          $inc: {
            'status.replicas': 1,
            'status.readyReplicas': 1,
            'status.availableReplicas': 1,
          },
          $set: {
            conditions: [{
              "type": "Progressing",
              "status": "True",
              "lastUpdateTime": new Date(),
              "lastTransitionTime": new Date(),
            },
            {
              "type": "Available",
              "status": "True",
              "lastUpdateTime": new Date(),
              "lastTransitionTime": new Date(),
            }]
          }
        }),
        Service.findOne({ 'metadata.name': this.metadata.name, 'metadata.namespace': config.metadata.namespace })
        .then((service) => {
          if (service) {
            return service.addPod(newPod.status.podIP);
          }
        })
      ])
    })
    .then(() => {
      if (this?.status?.replicas > this?.spec?.replicas) {
        return this.deletePod();
      }
    })
  }

  async rollout(numPods = this.spec.replicas) {
    if (this.rollingOut === false) {
      this.rollingOut = true;
      if (this.spec.strategy.type === "RollingUpdate") {
        let percent = Number(`${this.spec.strategy.rollingUpdate.maxUnavailable}`.match(/\d*/)[0]);;
        let newPods = 0;
        do {
          await Promise.all(
            new Array(Math.ceil(numPods * percent / 100))
            .fill(0)
            .map(() => {
              newPods += 1;
              return this.createPod(this.spec.template);
            })
          );
        } while (this.status.replicas < numPods);
      } else if (this.spec.strategy.type === "Recreate") {
        Promise.all(
          new Array(numPods)
          .fill(0)
          .map(() => {
            return this.deletePod();
          })
        ).then(() =>
          new Array(numPods)
          .fill(0)
          .map(() => {
            return this.createPod(this.spec.template);
          })
        )
      }
    }
    this.rollingOut = false;
  }
}

module.exports = Deployment;
