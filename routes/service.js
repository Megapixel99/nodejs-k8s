const router = require('express').Router();
const { parse, stringify } = require('yaml');
const { Service } = require('../database/models.js');
const { Services } = require('../objects');
const { createService } = require('../functions.js');
const { apiV1OpenapiV3, validSchema } = require('./openapi.js');

let routes = ['/apis/apps/v1/namespaces/:namespace/services', '/api/v1/namespaces/:namespace/services'];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenapiV3), (req, res, next) => {
  Service.findOne({ 'metadata.name': req.params.name }).then((deployment) => {
    res.send(deployment);
  }).catch(next);
});

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenapiV3), (req, res, next) => {
  if (Object.keys(req.body).length > 0) {
    Service.findOneAndUpdate({ 'metadata.name': req.params.name }, req.body).then((deployment) => {
      new Services(deployment).rollout();
      res.send(deployment);
    }).catch(next);
  } else {
    Service.findOne({ 'metadata.name': req.params.name }).then((deployment) => {
      new Services(deployment).rollout();
      res.send(deployment);
    }).catch(next);
  }
});

router.get(routes.map((e) => `${e}/:name/status`), validSchema(apiV1OpenapiV3), (req, res, next) => {
  Service.findOne({ 'metadata.name': req.params.name }).then((deployment) => {
    res.send(deployment.status);
  }).catch(next);
});

router.post(routes, validSchema(apiV1OpenapiV3), (req, res, next) => {
  if (!req.body?.metadata?.creationTimestamp) {
    req.body.metadata.creationTimestamp = new Date();
  }
  if (!req.body?.metadata?.namespace) {
    req.body.metadata.namespace = (req.params.namespace || "default");
  }
  createService(req.body).then((service) => {
    res.status(201).send(service);
  }).catch(next);
});

module.exports = router;
