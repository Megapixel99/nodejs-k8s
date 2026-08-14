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
  age,
}  = require('../functions.js');

// The ReplicationControllers a deployment owns are named
// `<deployment>-<generation>`. Matching on the bare prefix `^<name>` also
// matched every other deployment's controllers whose name starts with this
// one's: deployment `web` counted (and, on delete, removed) `web-cache-1`.
// Anchoring on the generation suffix — and escaping the name, which is
// interpolated straight into a regex — keeps a deployment to its own.
function ownedControllers(deployment) {
  let escaped = `${deployment.metadata.name}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    'metadata.name': { $regex: `^${escaped}-\\d+$` },
    'metadata.namespace': deployment.metadata.namespace,
  };
}

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
          return ReplicationController.find(
            ownedControllers(newDeployment),
            { sort: { 'created_at': 1 } }
          )
          .then((rcs) => ReplicationController.create({
            metadata: {
              ...newDeployment.metadata,
              name: `${newDeployment.metadata.name}-${rcs.length + 1}`
            },
            spec: {
              ...newDeployment.spec,
              selector: {
                app: newDeployment.metadata.name,
                deployment: `${newDeployment.metadata.name}-${rcs.length + 1}`,
              },
              minReadySeconds: Infinity,
            },
          }))
          .then((rc) => newDeployment.rollout(rc));
        }
      return newDeployment;
    })
  }

  update(updateObj, searchQ) {
    return Promise.all([
      super.patch(updateObj, searchQ),
      ReplicationController.find(
        ownedControllers(this),
        { sort: { 'created_at': 1 } }
      )
    ])
    .then(async (arr) => {
      let [ deployment, rc ] = arr;
      if (deployment) {
        let newDeployment = new Deployment(deployment);
        let previousRc = (rc || []).at(-1);
        if (newDeployment.spec.paused !== true) {
          return ReplicationController.create({
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
          })
          .then((created) => newDeployment.rollout(created, previousRc));
        }
        return newDeployment;
      }
    });
  }

  delete() {
    return ReplicationController.find(ownedControllers(this))
    .then((rcs) => {
      return Promise.all([
        ...rcs.map((rc) => rc.delete()),
        super.delete(),
      ]);
    });
  }

  static async table (items = []) {
    return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${items.length}${JSON.stringify(items[0])}`)}`,
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
        "rows": items.map((e) => ({
          "cells": [
            e.metadata.name,
            `${e.status?.availableReplicas ?? 0}/${e.spec?.replicas ?? 0}`,
            e.status?.updatedReplicas ?? 0,
            e.status?.availableReplicas ?? 0,
            age(e.metadata.creationTimestamp),
            (e.spec?.template?.spec?.containers || []).map((c) => c.name).join(', '),
            (e.spec?.template?.spec?.containers || []).map((c) => c.image).join(', '),
            // A display cell must not be able to fail the request: a missing
            // selector used to throw here and answer `kubectl get deployments`
            // with a 500.
            Object.entries(e.spec?.selector?.matchLabels || {}).map(([k, v]) => `${k}=${v}`).join(','),
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

  async rollout(_rc, previousRc) {
    let rc = _rc;
    if (!rc) {
      // This re-declared `rc` with `let`, so the lookup's result was thrown
      // away and the outer rc stayed undefined.
      rc = (await ReplicationController.findAllSorted(ownedControllers(this)))[0];
    }
    if (!rc) {
      return undefined;
    }
    // The old loop was written as if every rollout were replacing an existing
    // generation: it created a pod, then deleted one, and adjusted the
    // deployment's counters with a `conditions.$` positional query that never
    // matched on a fresh object — so the +1 silently did nothing while the -1
    // (which had no query at all) always applied. A new deployment ended up
    // with churned pods and a negative replica count.
    let percent = Number(`${this.spec.strategy?.rollingUpdate?.maxUnavailable ?? '25%'}`.match(/\d+/)?.[0] || 25);
    let desired = this.spec.replicas ?? 1;
    let batchSize = Math.max(1, Math.ceil(desired * percent / 100));

    if (this.spec.strategy.type === "Recreate") {
      if (previousRc) {
        await previousRc.deletePods();
      }
      await rc.createPods(desired);
      return this.patch({
        $set: {
          'status.replicas': desired,
          'status.readyReplicas': desired,
          'status.availableReplicas': desired,
          'status.updatedReplicas': desired,
        },
      });
    }

    let created = 0;
    while (created < desired) {
      let batch = Math.min(batchSize, desired - created);
      let pods = await rc.createPods(batch);
      created += batch;

      let service = await Service.findOne({
        'metadata.name': this.metadata.name,
        'metadata.namespace': this.metadata.namespace,
      });
      if (service) {
        for (const pod of pods.flat().filter(Boolean)) {
          await service.addPod(pod);
        }
      }

      // Only a previous generation gets retired. Deleting from `rc` here is
      // deleting the replicas we just created.
      if (previousRc) {
        await previousRc.deletePods(batch);
        if (service) {
          let oldest = await service.findOldestPod();
          if (oldest) {
            await oldest.removePod();
          }
        }
      }

      await this.patch({
        $inc: {
          'status.replicas': batch,
          'status.readyReplicas': batch,
          'status.availableReplicas': batch,
          'status.updatedReplicas': batch,
        },
      });
    }
    return this;
  }
}

module.exports = Deployment;
