const router = require('express').Router();
const { namespace } = require('../database/models.js');

router.get(['/api/v1', '/apis'], (req, res, next) => {
  res.json({
    "kind": "APIResourceList",
    "groupVersion": "v1",
    "resources": [{
      "name": "namespaces",
      "singularName": "namespace",
      "namespaced": false,
      "kind": "Namespace",
      "verbs": [
        "create",
        "delete",
        "get",
        "list",
        "patch",
        "update",
        "watch"
      ],
      "shortNames": [ "ns" ],
    }, {
      "name": "deployments",
      "singularName": "deployment",
      "namespaced": true,
      "kind": "Deployment",
      "verbs": [
        "create",
        "delete",
        "deletecollection",
        "get",
        "list",
        "patch",
        "update",
        "watch"
      ],
      "shortNames": [ "deploy" ],
      "categories": [ "all" ],
    }, {
      "name": "pods",
      "singularName": "pod",
      "namespaced": true,
      "kind": "Pod",
      "verbs": [
        "create",
        "delete",
        "get",
        "list",
        "patch",
        "update",
        "watch"
      ],
      "shortNames": [ "pod" ],
      "categories": [ "all" ],
    }]
  });
});

router.get('/api', (req, res, next) => {
  res.json({
    "kind": "APIVersions",
    "versions": [
      "v1"
    ],
    "serverAddressByClientCIDRs": [
      {
        "clientCIDR": "0.0.0.0/0",
        "serverAddress": "localhost:8080"
      }
    ]
  });
});

module.exports = router;
