const router = require('express').Router();
const { parse, stringify } = require('yaml');
const { Pod } = require('../../objects');
const { duration } = require('../../functions.js');

router.get('/', (req, res, next) => {
  Pod.find().then((pods) => {
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
    });
  }).catch(next);
});

module.exports = router;
