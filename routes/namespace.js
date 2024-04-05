const router = require('express').Router();
const { Namespace } = require('../database/models.js');
const { apiAppsV1OpenApiV3, validSchema } = require('./openapi.js');

router.get('/api/v1/namespaces/:name', validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  Namespace.find({ 'metadata.name': req.query.name }).then((namespace) => {
    res.send(namespace);
  }).catch(next);
});

router.get('/api/v1/namespaces/:name/status', validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  Namespace.find({ 'metadata.name': req.query.name }).then((namespace) => {
    res.send(namespace.status);
  }).catch(next);
});

router.post('/api/v1/namespaces', validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  if (!req.body?.metadata?.creationTimestamp) {
    req.body.metadata.creationTimestamp = new Date();
  }
  new Namespace(req.body).save().then((namespace) => {
    res.status(201).send(namespace);
  }).catch(next);
});

module.exports = router;
