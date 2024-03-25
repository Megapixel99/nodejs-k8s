const router = require('express').Router();
const { parse, stringify } = require('yaml');
const { Deployment } = require('../database/models.js');
const { Deployments } = require('../objects');

router.get('/:name', (req, res, next) => {
  Deployment.findOne({ 'metadata.name': req.params.name }).then((deployment) => {
    res.send(deployment);
  }).catch(next);
});

router.patch('/:name', (req, res, next) => {
  if (Object.keys(req.body).length > 0) {
    Deployment.findOneAndUpdate({ 'metadata.name': req.params.name }, req.body).then((deployment) => {
      new Deployments(deployment).rollout();
      res.send(deployment);
    }).catch(next);
  } else {
    Deployment.findOne({ 'metadata.name': req.params.name }).then((deployment) => {
      new Deployments(deployment).rollout();
      res.send(deployment);
    }).catch(next);
  }
});

router.get('/:name/status', (req, res, next) => {
  Deployment.findOne({ 'metadata.name': req.params.name }).then((deployment) => {
    res.send(deployment.status);
  }).catch(next);
});

router.post('/', (req, res, next) => {
  if (!req.body?.metadata?.creationTimestamp) {
    req.body.metadata.creationTimestamp = new Date();
  }
  if (!req.body?.metadata?.namespace) {
    req.body.metadata.namespace = (req.params.namespace || "default");
  }
  new Deployment(req.body).save().then((deployment) => {
    res.status(201).send(deployment);
    if (deployment.spec.paused !== true) {
      new Deployments(deployment).rollout();
    }
  }).catch(next);
});

module.exports = router;
