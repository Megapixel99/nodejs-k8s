const router = require('express').Router();
const { parse, stringify } = require('yaml');
const { Pod } = require('../database/models.js');
const { apiV1OpenapiV3 } = require('./openapi.js');
const { duration } = require('../functions.js');

router.get('/:name', (req, res, next) => {
  pod.find({ metadata: { name: req.query.name } }).then((pod) => {
    res.send(pod);
  }).catch(next);
});

router.get('/:name/status', (req, res, next) => {
  pod.find({ metadata: { name: req.query.name } }).then((pod) => {
    res.send(pod.status);
  }).catch(next);
});

router.post('/',
(req, res, next) => apiV1OpenapiV3.validPath(req.baseUrl[req.method.toLowerCase()])(req, res, next),
(req, res, next) => {
  if (!req.body?.metadata?.creationTimestamp) {
    req.body.metadata.creationTimestamp = new Date();
  }
  new Pod(req.body).save().then((pod) => {
    res.status(201).send(pod);
  }).catch(next);
});

module.exports = router;
