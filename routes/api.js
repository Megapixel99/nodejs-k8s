const router = require('express').Router();
const { namespace } = require('../database/models.js');

router.get('/apis', (req, res, next) => {
  res.json({
    "kind": "APIResourceList",
    "groupVersion": "v1",
    "resources": [{
      "name": "namespaces",
      "singularName": "",
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
      "name": "deployment",
      "singularName": "",
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
