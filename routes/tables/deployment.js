const router = require('express').Router();
const { parse, stringify } = require('yaml');
const { Deployment } = require('../../objects');
const { duration } = require('../../functions.js');

router.get('/', (req, res, next) => {
  Deployment.find().then((deployments) => {
    res.send({
      "kind": "Table",
      "apiVersion": "meta.k8s.io/v1",
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
    });
  }).catch(next);
});

module.exports = router;
