const router = require('express').Router();
const { parse, stringify } = require('yaml');
const { Secret } = require('../../database/models.js');
const { duration } = require('../../functions.js');

router.get('/', (req, res, next) => {
  Secret.find().then((secrets) => {
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
          "format": "",
          "description": "The type of secret",
          "priority": 0
        },
        {
          "name": "Data",
          "type": "string",
          "format": "",
          "description": "Number of items in the secret",
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
      "rows": secrets.map((e) => ({
        "cells": [
          e.metadata.name,
          e.type,
          e.data.length,
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

module.exports = router;
