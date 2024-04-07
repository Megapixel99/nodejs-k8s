const router = require('express').Router();
const { Ingress } = require('../objects');
const { apiNetworkingK8sIoV1OpenApiV3, apiV1OpenapiV3, validSchema } = require('./openapi.js');

const routes = ['/apis/networking.k8s.io/v1/namespaces/:namespace/ingresses', '/api/v1/namespaces/:namespace/ingresses'];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiNetworkingK8sIoV1OpenApiV3), (req, res, next) => {
  Ingress.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
  .then((ingress) => {
    if (ingress) {
      return res.status(200).send(ingress);
    }
    return res.status(404).send(Ingress.notFoundStatus(req.params.name));
  })
  .catch(next);
});

router.get(routes, validSchema(apiNetworkingK8sIoV1OpenApiV3), (req, res, next) => {
  if (req.headers?.accept?.split(';').find((e) => e === 'as=Table')) {
    return Ingress.table({
      ...req.query,
      namespace: req.params.namespace,
    })
      .then((ingressList) => res.status(200).send(ingressList))
      .catch(next);
  }
  Ingress.list({
    ...req.query,
    namespace: req.params.namespace,
  })
    .then((ingressList) => res.status(200).send(ingressList))
    .catch(next);
})

router.get('/api/v1/ingress', validSchema(apiV1OpenapiV3), (req, res, next) => {
  if (req.headers?.accept?.split(';').find((e) => e === 'as=Table')) {
    return Ingress.table(req.query)
      .then((ingressList) => res.status(200).send(ingressList))
      .catch(next);
  }
  Ingress.list(req.query)
  .then((ingressList) => res.status(200).send(ingressList))
  .catch(next);
});

router.post(routes, validSchema(apiNetworkingK8sIoV1OpenApiV3), (req, res, next) => {
  if (!req.body?.metadata?.creationTimestamp) {
    req.body.metadata.creationTimestamp = new Date();
  }
  if (!req.body?.metadata?.namespace) {
    req.body.metadata.namespace = (req.params.namespace || "default");
  }
  Ingress.create(req.body)
  .then((ingress) => res.status(201).send(ingress))
  .catch(next);
});

router.put(routes, validSchema(apiNetworkingK8sIoV1OpenApiV3), (req, res, next) => {
  if (Object.keys(req.body).length > 0) {
    Ingress.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((ingress) => ingress ? ingress.update(req.body) : Promise.resolve())
    .then((ingress) => {
      if (ingress) {
        return res.status(201).send(ingress);
      }
      return res.status(404).send(Ingress.notFoundStatus(req.params.name));
    })
    .catch(next);
  } else {
    Ingress.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((ingress) => {
      if (ingress) {
        return res.status(200).send(ingress);
      }
      return res.status(404).send(Ingress.notFoundStatus(req.params.name));
    })
    .catch(next);
  }
});

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiNetworkingK8sIoV1OpenApiV3), (req, res, next) => {
  if (Object.keys(req.body).length > 0) {
    Ingress.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((ingress) => ingress ? ingress.update(req.body) : Promise.resolve())
    .then((ingress) => {
      if (ingress) {
        return res.status(201).send(ingress);
      }
      return res.status(404).send(Ingress.notFoundStatus(req.params.name));
    })
    .catch(next);
  } else {
    Ingress.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((ingress) => ingress ? res.status(200).send(ingress) : res.status(200).send({}))
    .catch(next);
  }
});

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiNetworkingK8sIoV1OpenApiV3), (req, res, next) => {
  Ingress.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
  .then((ingress) => ingress ? ingress.delete() : Promise.resolve())
  .then((ingress) => {
    if (ingress) {
      return res.status(200).send(ingress.successfulStatus());
    }
    return res.status(404).send(Ingress.notFoundStatus(req.params.name));
  })
  .catch(next);
});

router.delete(routes, validSchema(apiNetworkingK8sIoV1OpenApiV3), (req, res, next) => {
  Ingress.find(req.body)
  .then((ingresses) => Promise.all(ingresses.map((ingress) => ingress.delete())))
  .then((ingress) => ingresses ? res.status(200).send(ingress) : res.status(200).send({}))
  .catch(next);
});

module.exports = router;
