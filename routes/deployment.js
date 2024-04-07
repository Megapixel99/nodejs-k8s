const router = require('express').Router();
const { Deployment } = require('../objects');
const { apiAppsV1OpenApiV3, apiV1OpenapiV3, validSchema } = require('./openapi.js');

let routes = ['/apis/apps/v1/namespaces/:namespace/deployments', '/api/v1/namespaces/:namespace/deployments'];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  Deployment.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
  .then((deployment) => {
    if (deployment) {
      return res.staus(200).send(deployment);
    }
    return res.status(404).send(Deployment.notFoundStatus(req.params.name));
  })
  .catch(next);
});

router.get(routes, validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  if (req.headers?.accept?.split(';').find((e) => e === 'as=Table')) {
    return Deployment.table({
      ...req.query,
      namespace: req.params.namespace,
    })
      .then((deploymentList) => res.status(200).send(deploymentList))
      .catch(next);
  }
  Deployment.list({
    ...req.query,
    namespace: req.params.namespace,
  })
    .then((deploymentList) => res.status(200).send(deploymentList))
    .catch(next);
})

router.get('/api/v1/deployments', validSchema(apiV1OpenapiV3), (req, res, next) => {
  if (req.headers?.accept?.split(';').find((e) => e === 'as=Table')) {
    return Deployment.table(req.query)
      .then((deploymentList) => res.status(200).send(deploymentList))
      .catch(next);
  }
  Deployment.list(req.query)
  .then((deploymentList) => res.status(200).send(deploymentList))
  .catch(next);
});

router.post(routes, validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  if (!req.body?.metadata?.creationTimestamp) {
    req.body.metadata.creationTimestamp = new Date();
  }
  if (!req.body?.metadata?.namespace) {
    req.body.metadata.namespace = (req.params.namespace || "default");
  }
  Deployment.create(req.body)
  .then((deployment) => res.status(201).send(deployment))
  .catch(next);
});

router.put(routes, validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  if (Object.keys(req.body).length > 0) {
    Deployment.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((deployment) => deployment ? deployment.update(req.body) : Promise.resolve())
    .then((deployment) => {
      if (deployment) {
        return res.staus(201).send(deployment);
      }
      return res.status(404).send(Deployment.notFoundStatus(req.params.name));
    })
    .catch(next);
  } else {
    Deployment.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((deployment) => {
      if (deployment) {
        return res.staus(200).send(deployment);
      }
      return res.status(404).send(Deployment.notFoundStatus(req.params.name));
    })
    .catch(next);
  }
});

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  if (Object.keys(req.body).length > 0) {
    Deployment.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((deployment) => deployment ? deployment.update(req.body) : Promise.resolve())
    .then((deployment) => {
      if (deployment) {
        return res.staus(201).send(deployment);
      }
      return res.status(404).send(Deployment.notFoundStatus(req.params.name));
    })
    .catch(next);
  } else {
    Deployment.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((deployment) => deployment ? res.staus(200).send(deployment) : res.status(200).send({}))
    .catch(next);
  }
});

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  Deployment.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
  .then((deployment) => deployment ? deployment.delete() : Promise.resolve())
  .then((deployment) => {
    if (deployment) {
      return res.staus(200).send(deployment.successfulStatus());
    }
    return res.status(404).send(Deployment.notFoundStatus(req.params.name));
  })
  .catch(next);
});

router.delete(routes, validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  Deployment.find(req.body)
  .then((deployments) => Promise.all(deployments.map((deployment) => deployment.delete())))
  .then((deployment) => deployments ? res.staus(200).send(deployment) : res.status(200).send({}))
  .catch(next);
});

module.exports = router;
