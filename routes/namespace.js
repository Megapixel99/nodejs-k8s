const router = require('express').Router();
const { parse, stringify } = require('yaml');
const { Namespace } = require('../database/models.js');

router.get('/', (req, res, next) => {
  namespace.find().then((namespaces) => {
    res.send({
      items: namespaces,
      metadata: {
        remainingItemCount: 0,
        continue: false,
        resourceVersion: "v1",
      },
      apiVersion: "v1",
      kind: "NamespaceList",
    });
  }).catch(next);
});

router.get('/:name', (req, res, next) => {
  namespace.find({ metadata: { name: req.query.name } }).then((namespace) => {
    res.send(namespace);
  }).catch(next);
});

router.get('/:name/status', (req, res, next) => {
  namespace.find({ metadata: { name: req.query.name } }).then((namespace) => {
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
})

module.exports = router;
