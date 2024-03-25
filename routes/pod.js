const router = require('express').Router();
const emitter = require('../eventHandlers/emitter.js');
const { Pod } = require('../database/models.js');
const { apiV1OpenapiV3 } = require('./openapi.js');
const { duration, createPod } = require('../functions.js');

router.get('/:name', (req, res, next) => {
  Pod.find({ 'metadata.name': req.query.name }).then((pod) => {
    res.send(pod);
  }).catch(next);
});

router.get('/:name/status', (req, res, next) => {
  Pod.find({ 'metadata.name': req.query.name }).then((pod) => {
    res.send(pod.status);
  }).catch(next);
});

router.post('/',
(req, res, next) => apiV1OpenapiV3.validPath(req.baseUrl[req.method.toLowerCase()])(req, res, next),
async (req, res, next) => {
  if (!req.body?.metadata?.creationTimestamp) {
    req.body.metadata.creationTimestamp = new Date();
  }
  if (!req.body?.metadata?.namespace) {
    req.body.metadata.namespace = req.params.namespace;
  }
  res.status(202).send(req.body);
  createPod(req.body);
});

module.exports = router;
