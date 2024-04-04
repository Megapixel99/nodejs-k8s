const router = require('express').Router();
const { Pod } = require('../database/models.js');
const { apiV1OpenapiV3, validSchema } = require('./openapi.js');
const { duration, createPod } = require('../functions.js');

let routes = ['/apis/apps/v1/namespaces/:namespace/pods', '/api/v1/namespaces/:namespace/pods'];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenapiV3), (req, res, next) => {
  Pod.find({ 'metadata.name': req.query.name }).then((pod) => {
    res.send(pod);
  }).catch(next);
});

router.get(routes.map((e) => `${e}/:name/status`), validSchema(apiV1OpenapiV3), (req, res, next) => {
  Pod.find({ 'metadata.name': req.query.name }).then((pod) => {
    res.send(pod.status);
  }).catch(next);
});

router.post(routes, validSchema(apiV1OpenapiV3), (req, res, next) => {
  if (!req.body?.metadata?.creationTimestamp) {
    req.body.metadata.creationTimestamp = new Date();
  }
  if (!req.body?.metadata?.namespace) {
    req.body.metadata.namespace = (req.params.namespace || "default");
  }
  res.status(202).send(req.body);
  createPod(req.body);
});

module.exports = router;
