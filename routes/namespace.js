const router = require('express').Router();
const { parse, stringify } = require('yaml');
const { Namespace } = require('../database/models.js');
const { duration } = require('../functions.js');

router.get('/:name', (req, res, next) => {
  Namespace.find({ metadata: { name: req.query.name } }).then((namespace) => {
    res.send(namespace);
  }).catch(next);
});

router.get('/:name/status', (req, res, next) => {
  Namespace.find({ metadata: { name: req.query.name } }).then((namespace) => {
    res.send(namespace.status);
  }).catch(next);
});

router.post('/', (req, res, next) => {
  if (!req.body?.metadata?.creationTimestamp) {
    req.body.metadata.creationTimestamp = new Date();
  }
  new Namespace(req.body).save().then((namespace) => {
    res.status(201).send(namespace);
  }).catch(next);
});

module.exports = router;
