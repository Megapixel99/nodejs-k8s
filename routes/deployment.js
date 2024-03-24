const router = require('express').Router();
const { parse, stringify } = require('yaml');
const { Deployment } = require('../database/models.js');

router.get('/', (req, res, next) => {
  deployment.find().then((deployments) => {
    res.send({
      items: deployments,
      metadata: {
        remainingItemCount: 0,
        continue: false,
        resourceVersion: "v1",
      },
      apiVersion: "v1",
      kind: "DeploymentList",
    });
  }).catch(next);
});

router.get('/:name', (req, res, next) => {
  deployment.find({ metadata: { name: req.query.name } }).then((deployment) => {
    res.send(deployment);
  }).catch(next);
});

router.get('/:name/status', (req, res, next) => {
  deployment.find({ metadata: { name: req.query.name } }).then((deployment) => {
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
})

module.exports = router;
