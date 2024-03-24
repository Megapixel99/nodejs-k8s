const router = require('express').Router();
const { parse, stringify } = require('yaml');
const { Namespace } = require('../database/models.js');
const { duration } = require('../functions.js');

router.get('/', (req, res, next) => {
  Namespace.find().then((namespaces) => {
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
          "name": "Age",
          "type": "string",
          "format": "",
          "description": "CreationTimestamp is a timestamp representing the server time when this object was created. It is not guaranteed to be set in happens-before order across separate operations. Clients may not set this value. It is represented in RFC3339 form and is in UTC.\n\nPopulated by the system. Read-only. Null for lists. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata",
          "priority": 0
        },
      ],
      "rows": namespaces.map((e) => ({
        "cells": [
          e.metadata.name,
          duration(new Date() - e.metadata.creationTimestamp),
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

router.get('/:name', (req, res, next) => {
  Namespace.find({ metadata: { name: req.query.name } }).then((namespace) => {
    res.send(namespace);
  }).catch(next);
});

router.get('/:name/status', (req, res, next) => {
  Namespace.find({ metadata: { name: req.query.name } }).then((namespace) => {
    res.send(namespace.status);
  }).catch(next);
});

router.post('/', (req, res, next) => {
  if (!req.body?.metadata?.creationTimestamp) {
    req.body.metadata.creationTimestamp = new Date();
  }
  new Namespace(req.body).save().then((namespace) => {
    res.status(201).send(namespace);
  }).catch(next);
})

module.exports = router;
