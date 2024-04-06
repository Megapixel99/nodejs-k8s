const router = require('express').Router();
const { Secret } = require('../objects');
const { apiAppsV1OpenApiV3, apiV1OpenapiV3, validSchema } = require('./openapi.js');

let routes = ['/api/v1/namespaces/:namespace/secrets'];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  Secret.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
  .then((secret) => {
    if (secret) {
      return res.staus(200).send(secret);
    }
    return res.status(404).send(Secret.notFoundStatus(req.params.name));
  })
  .catch(next);
});

router.get('api/v1/secrets', validSchema(apiV1OpenapiV3), (req, res, next) => {
  Secret.find()
  .then((secrets) => res.status(200).send(secrets))
  .catch(next);
});

router.post(routes, validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  if (!req.body?.metadata?.creationTimestamp) {
    req.body.metadata.creationTimestamp = new Date();
  }
  if (!req.body?.metadata?.namespace) {
    req.body.metadata.namespace = (req.params.namespace || "default");
  }
  Secret.create(req.body)
  .then((secret) => res.status(201).send(secret))
  .catch(next);
});

router.put(routes, validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  if (Object.keys(req.body).length > 0) {
    Secret.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((secret) => secret ? secret.update(req.body) : Promise.resolve())
    .then((secret) => {
      if (secret) {
        return res.staus(201).send(secret);
      }
      return res.status(404).send(Secret.notFoundStatus(req.params.name));
    })
    .catch(next);
  } else {
    Secret.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((secret) => {
      if (secret) {
        return res.staus(200).send(secret);
      }
      return res.status(404).send(Secret.notFoundStatus(req.params.name));
    })
    .catch(next);
  }
});

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  if (Object.keys(req.body).length > 0) {
    Secret.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((secret) => secret ? secret.update(req.body) : Promise.resolve())
    .then((secret) => {
      if (secret) {
        return res.staus(201).send(secret);
      }
      return res.status(404).send(Secret.notFoundStatus(req.params.name));
    })
    .catch(next);
  } else {
    Secret.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((secret) => secret ? res.staus(200).send(secret) : res.status(200).send({}))
    .catch(next);
  }
});

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  Secret.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
  .then((secret) => secret ? secret.delete() : Promise.resolve())
  .then((secret) => {
    if (secret) {
      return res.staus(200).send(secret.successfulStatus());
    }
    return res.status(404).send(Secret.notFoundStatus(req.params.name));
  })
  .catch(next);
});

router.delete(routes, validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  Secret.find(req.body)
  .then((secrets) => Promise.all(secrets.map((secret) => secret.delete())))
  .then((secret) => secrets ? res.staus(200).send(secret) : res.status(200).send({}))
  .catch(next);
});

module.exports = router;
