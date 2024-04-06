const router = require('express').Router();
const { Pod } = require('../objects');
const { apiV1OpenapiV3, validSchema } = require('./openapi.js');

let routes = ['/apis/apps/v1/namespaces/:namespace/pods', '/api/v1/namespaces/:namespace/pods'];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenapiV3), (req, res, next) => {
  Pod.find({ 'metadata.name': req.query.name })
  .then((pod) => res.send(pod))
  .catch(next);
});

router.get(routes.map((e) => `${e}/:name/status`), validSchema(apiV1OpenapiV3), (req, res, next) => {
  Pod.find({ 'metadata.name': req.query.name })
  .then((pod) => res.send(pod))
  .catch(next);
});

router.post(routes, validSchema(apiV1OpenapiV3), (req, res, next) => {
  if (!req.body?.metadata?.creationTimestamp) {
    req.body.metadata.creationTimestamp = new Date();
  }
  if (!req.body?.metadata?.namespace) {
    req.body.metadata.namespace = (req.params.namespace || "default");
  }
  Pod.create(req.body)
  .then((pod) => res.status(201).send(pod))
  .catch(next);
});

module.exports = router;
