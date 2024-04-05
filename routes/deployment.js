const router = require('express').Router();
const { Deployment } = require('../objects');
const { apiAppsV1OpenApiV3, validSchema } = require('./openapi.js');

let routes = ['/apis/apps/v1/namespaces/:namespace/deployments', '/api/v1/namespaces/:namespace/deployments'];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  Deployment.findOne({ 'metadata.name': req.params.name }).then((deployment) => {
    res.send(deployment);
  }).catch(next);
});

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  if (Object.keys(req.body).length > 0) {
    Deployment.findOne({ 'metadata.name': req.params.name })
    .then((deployment) => deployment.update(req.body))
    .then((deployment) => {
      res.send(deployment);
      deployment.rollout();
    }).catch(next);
  } else {
    Deployment.findOne({ 'metadata.name': req.params.name }).then((deployment) => {
      res.send(deployment);
      deployment.rollout();
    }).catch(next);
  }
});

router.get(routes.map((e) => `${e}/:name/status`), validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  Deployment.findOne({ 'metadata.name': req.params.name }).then((deployment) => {
    res.send(deployment.status);
  }).catch(next);
});

router.post(routes, validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  if (!req.body?.metadata?.creationTimestamp) {
    req.body.metadata.creationTimestamp = new Date();
  }
  if (!req.body?.metadata?.namespace) {
    req.body.metadata.namespace = (req.params.namespace || "default");
  }
  Deployment.create(req.body)
  .then((deployment) => res.status(201).send(deployment))
  .catch(next);
});

module.exports = router;
