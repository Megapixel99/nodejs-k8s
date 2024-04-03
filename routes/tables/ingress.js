const router = require('express').Router();
const { parse, stringify } = require('yaml');
const { Pod } = require('../../database/models.js');
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
      "rows": pods.map((e) => ({
        "cells": [
          e.metadata.name,
          e.spec.type,
          (e.spec.clusterIP || e.spec.clusterIPs?.join() || '<None>'),
          (e.spec.externalIPs?.join() || '<None>'),
          e.spec?.ports?.length > 0 ? e.spec.ports.map((e) => `${e.port}/${e.protocol}`).join() : '<None>',
          duration(new Date() - e.metadata.creationTimestamp),
          e.spec?.selector && Object.keys(e.spec.selector).length > 0 ? Object.entries(e.spec.selector).map((e) => `${e[0]}=${e[1]}`).join() : '<None>',
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
