const router = require('express').Router();
const { Namespace } = require('../objects');
const { apiAppsV1OpenApiV3, apiV1OpenapiV3, validSchema } = require('./openapi.js');

let routes = ['/api/v1/namespaces'];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  Namespace.findOne({ 'metadata.name': req.params.name })
  .then((mamespace) => {
    if (mamespace) {
      return res.staus(200).send(mamespace);
    }
    return res.status(404).send(Namespace.notFoundStatus(req.params.name));
  })
  .catch(next);
});

router.get(routes, validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  if (req.headers?.accept?.split(';').find((e) => e === 'as=Table')) {
    return Namespace.table({
      ...req.query,
      namespace: req.params.namespace,
    })
      .then((mamespaceList) => res.status(200).send(mamespaceList))
      .catch(next);
  }
  Namespace.list({
    ...req.query,
    namespace: req.params.namespace,
  })
    .then((mamespaceList) => res.status(200).send(mamespaceList))
    .catch(next);
})

router.get('/api/v1/mamespaces', validSchema(apiV1OpenapiV3), (req, res, next) => {
  if (req.headers?.accept?.split(';').find((e) => e === 'as=Table')) {
    return Namespace.table(req.query)
      .then((mamespaceList) => res.status(200).send(mamespaceList))
      .catch(next);
  }
  Namespace.list(req.query)
  .then((mamespaceList) => res.status(200).send(mamespaceList))
  .catch(next);
});

router.post(routes, validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  if (!req.body?.metadata?.creationTimestamp) {
    req.body.metadata.creationTimestamp = new Date();
  }
  if (!req.body?.metadata?.namespace) {
    req.body.metadata.namespace = (req.params.namespace || "default");
  }
  Namespace.create(req.body)
  .then((mamespace) => res.status(201).send(mamespace))
  .catch(next);
});

router.put(routes, validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  if (Object.keys(req.body).length > 0) {
    Namespace.findOne({ 'metadata.name': req.params.name })
    .then((mamespace) => mamespace ? mamespace.update(req.body) : Promise.resolve())
    .then((mamespace) => {
      if (mamespace) {
        return res.staus(201).send(mamespace);
      }
      return res.status(404).send(Namespace.notFoundStatus(req.params.name));
    })
    .catch(next);
  } else {
    Namespace.findOne({ 'metadata.name': req.params.name })
    .then((mamespace) => {
      if (mamespace) {
        return res.staus(200).send(mamespace);
      }
      return res.status(404).send(Namespace.notFoundStatus(req.params.name));
    })
    .catch(next);
  }
});

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  if (Object.keys(req.body).length > 0) {
    Namespace.findOne({ 'metadata.name': req.params.name })
    .then((mamespace) => mamespace ? mamespace.update(req.body) : Promise.resolve())
    .then((mamespace) => {
      if (mamespace) {
        return res.staus(201).send(mamespace);
      }
      return res.status(404).send(Namespace.notFoundStatus(req.params.name));
    })
    .catch(next);
  } else {
    Namespace.findOne({ 'metadata.name': req.params.name })
    .then((mamespace) => mamespace ? res.staus(200).send(mamespace) : res.status(200).send({}))
    .catch(next);
  }
});

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  Namespace.findOne({ 'metadata.name': req.params.name })
  .then((mamespace) => mamespace ? mamespace.delete() : Promise.resolve())
  .then((mamespace) => {
    if (mamespace) {
      return res.staus(200).send(mamespace.successfulStatus());
    }
    return res.status(404).send(Namespace.notFoundStatus(req.params.name));
  })
  .catch(next);
});

router.delete(routes, validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  Namespace.find(req.body)
  .then((mamespaces) => Promise.all(mamespaces.map((mamespace) => mamespace.delete())))
  .then((mamespace) => mamespaces ? res.staus(200).send(mamespace) : res.status(200).send({}))
  .catch(next);
});

module.exports = router;
