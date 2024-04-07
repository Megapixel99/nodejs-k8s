const router = require('express').Router();
const { Endpoints } = require('../objects');
const { apiNetworkingK8sIoV1OpenApiV3, apiV1OpenapiV3, validSchema } = require('./openapi.js');

const routes = ['/apis/networking.k8s.io/v1/namespaces/:namespace/endpointses', '/api/v1/namespaces/:namespace/endpointses'];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiNetworkingK8sIoV1OpenApiV3), (req, res, next) => {
  Endpoints.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
  .then((endpoints) => {
    if (endpoints) {
      return res.staus(200).send(endpoints);
    }
    return res.status(404).send(Endpoints.notFoundStatus(req.params.name));
  })
  .catch(next);
});

router.get(routes, validSchema(apiNetworkingK8sIoV1OpenApiV3), (req, res, next) => {
  if (req.headers?.accept?.split(';').find((e) => e === 'as=Table')) {
    return Endpoints.table({
      ...req.query,
      namespace: req.params.namespace,
    })
      .then((endpointsList) => res.status(200).send(endpointsList))
      .catch(next);
  }
  Endpoints.list({
    ...req.query,
    namespace: req.params.namespace,
  })
    .then((endpointsList) => res.status(200).send(endpointsList))
    .catch(next);
})

router.get('/api/v1/endpoints', validSchema(apiV1OpenapiV3), (req, res, next) => {
  if (req.headers?.accept?.split(';').find((e) => e === 'as=Table')) {
    return Endpoints.table(req.query)
      .then((endpointsList) => res.status(200).send(endpointsList))
      .catch(next);
  }
  Endpoints.list(req.query)
  .then((endpointsList) => res.status(200).send(endpointsList))
  .catch(next);
});

router.post(routes, validSchema(apiNetworkingK8sIoV1OpenApiV3), (req, res, next) => {
  if (!req.body?.metadata?.creationTimestamp) {
    req.body.metadata.creationTimestamp = new Date();
  }
  if (!req.body?.metadata?.namespace) {
    req.body.metadata.namespace = (req.params.namespace || "default");
  }
  Endpoints.create(req.body)
  .then((endpoints) => res.status(201).send(endpoints))
  .catch(next);
});

router.put(routes, validSchema(apiNetworkingK8sIoV1OpenApiV3), (req, res, next) => {
  if (Object.keys(req.body).length > 0) {
    Endpoints.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((endpoints) => endpoints ? endpoints.update(req.body) : Promise.resolve())
    .then((endpoints) => {
      if (endpoints) {
        return res.staus(201).send(endpoints);
      }
      return res.status(404).send(Endpoints.notFoundStatus(req.params.name));
    })
    .catch(next);
  } else {
    Endpoints.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((endpoints) => {
      if (endpoints) {
        return res.staus(200).send(endpoints);
      }
      return res.status(404).send(Endpoints.notFoundStatus(req.params.name));
    })
    .catch(next);
  }
});

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiNetworkingK8sIoV1OpenApiV3), (req, res, next) => {
  if (Object.keys(req.body).length > 0) {
    Endpoints.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((endpoints) => endpoints ? endpoints.update(req.body) : Promise.resolve())
    .then((endpoints) => {
      if (endpoints) {
        return res.staus(201).send(endpoints);
      }
      return res.status(404).send(Endpoints.notFoundStatus(req.params.name));
    })
    .catch(next);
  } else {
    Endpoints.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((endpoints) => endpoints ? res.staus(200).send(endpoints) : res.status(200).send({}))
    .catch(next);
  }
});

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiNetworkingK8sIoV1OpenApiV3), (req, res, next) => {
  Endpoints.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
  .then((endpoints) => endpoints ? endpoints.delete() : Promise.resolve())
  .then((endpoints) => {
    if (endpoints) {
      return res.staus(200).send(endpoints.successfulStatus());
    }
    return res.status(404).send(Endpoints.notFoundStatus(req.params.name));
  })
  .catch(next);
});

router.delete(routes, validSchema(apiNetworkingK8sIoV1OpenApiV3), (req, res, next) => {
  Endpoints.find(req.body)
  .then((endpointses) => Promise.all(endpointses.map((endpoints) => endpoints.delete())))
  .then((endpoints) => endpointses ? res.staus(200).send(endpoints) : res.status(200).send({}))
  .catch(next);
});

module.exports = router;
