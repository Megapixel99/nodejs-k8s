const router = require('express').Router();
const { namespace } = require('../database/models.js');

router.get('/', (req, res) => {
  res.json({
  "kind": "APIResourceList",
  "groupVersion": "v1",
  "resources": [
    {
      "name": "namespaces",
      "singularName": "",
      "namespaced": false,
      "kind": "namespace",
      "verbs": [
        "create",
        "delete",
        "get",
        "list",
        "patch",
        "update",
        "watch"
      ],
      "shortNames": [
        "ns"
      ]
    }
  ]
});
});

module.exports = router;
