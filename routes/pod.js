const router = require('express').Router();
const { Pod } = require('../objects');
const { apiV1OpenapiV3, validSchema } = require('./openapi.js');

let routes = ['/apis/apps/v1/namespaces/:namespace/pods', '/api/v1/namespaces/:namespace/pods'];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenapiV3), (req, res, next) => {
  Pod.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
  .then((pod) => {
    if (pod) {
      return res.status(200).send(pod);
    }
    return res.status(404).send(Pod.notFoundStatus(req.params.name));
  })
  .catch(next);
});

router.get(routes, validSchema(apiV1OpenapiV3), (req, res, next) => {
  if (req.headers?.accept?.split(';').find((e) => e === 'as=Table')) {
    return Pod.table({
      ...req.query,
      namespace: req.params.namespace,
    })
      .then((podList) => res.status(200).send(podList))
      .catch(next);
  }
  Pod.list({
    ...req.query,
    namespace: req.params.namespace,
  })
    .then((podList) => res.status(200).send(podList))
    .catch(next);
})

router.get('/api/v1/pods', validSchema(apiV1OpenapiV3), (req, res, next) => {
  if (req.headers?.accept?.split(';').find((e) => e === 'as=Table')) {
    return Pod.table(req.query)
      .then((podList) => res.status(200).send(podList))
      .catch(next);
  }
  Pod.list(req.query)
  .then((podList) => res.status(200).send(podList))
  .catch(next);
});

router.post(routes, validSchema(apiV1OpenapiV3), (req, res, next) => {
  if (!req.body?.metadata?.creationTimestamp) {
    req.body.metadata.creationTimestamp = new Date();
  }
  if (!req.body?.metadata?.namespace) {
    req.body.metadata.namespace = (req.params.namespace || "default");
  }
  Pod.create(req.body)
  .then((pod) => res.status(201).send(pod))
  .catch(next);
});

router.put(routes, validSchema(apiV1OpenapiV3), (req, res, next) => {
  if (Object.keys(req.body).length > 0) {
    Pod.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((pod) => pod ? pod.update(req.body) : Promise.resolve())
    .then((pod) => {
      if (pod) {
        return res.status(201).send(pod);
      }
      return res.status(404).send(Pod.notFoundStatus(req.params.name));
    })
    .catch(next);
  } else {
    Pod.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((pod) => {
      if (pod) {
        return res.status(200).send(pod);
      }
      return res.status(404).send(Pod.notFoundStatus(req.params.name));
    })
    .catch(next);
  }
});

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenapiV3), (req, res, next) => {
  if (Object.keys(req.body).length > 0) {
    Pod.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((pod) => pod ? pod.update(req.body) : Promise.resolve())
    .then((pod) => {
      if (pod) {
        return res.status(201).send(pod);
      }
      return res.status(404).send(Pod.notFoundStatus(req.params.name));
    })
    .catch(next);
  } else {
    Pod.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((pod) => pod ? res.status(200).send(pod) : res.status(200).send({}))
    .catch(next);
  }
});

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenapiV3), (req, res, next) => {
  Pod.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
  .then((pod) => pod ? pod.delete() : Promise.resolve())
  .then((pod) => {
    if (pod) {
      return res.status(200).send(pod.successfulStatus());
    }
    return res.status(404).send(Pod.notFoundStatus(req.params.name));
  })
  .catch(next);
});

router.delete(routes, validSchema(apiV1OpenapiV3), (req, res, next) => {
  Pod.find(req.body)
  .then((pods) => Promise.all(pods.map((pod) => pod.delete())))
  .then((pod) => pods ? res.status(200).send(pod) : res.status(200).send({}))
  .catch(next);
});

module.exports = router;
