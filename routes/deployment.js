const router = require('express').Router();
const { parse, stringify } = require('yaml');
const { Deployment } = require('../database/models.js');

router.get('/:name', (req, res, next) => {
  Deployment.find({ metadata: { name: req.query.name } }).then((deployment) => {
    res.send(deployment);
  }).catch(next);
});

router.get('/:name/status', (req, res, next) => {
  Deployment.find({ metadata: { name: req.query.name } }).then((deployment) => {
    res.send(deployment.status);
  }).catch(next);
});

router.post('/', (req, res, next) => {
  if (!req.body?.metadata?.creationTimestamp) {
    req.body.metadata.creationTimestamp = new Date();
  }
  new Deployment(req.body).save().then((deployment) => {
    res.status(201).send(deployment);
  }).catch(next);
});

module.exports = router;
