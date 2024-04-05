const router = require('express').Router();
const { Ingress } = require('../database/models.js');
const { apiNetworkingK8sIoV1OpenApiV3, validSchema } = require('./openapi.js');

const routes = ['/apis/networking.k8s.io/v1/namespaces/:namespace/ingresses', '/api/v1/namespaces/:namespace/ingresses'];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiNetworkingK8sIoV1OpenApiV3), (req, res, next) => {
  Ingress.find({ 'metadata.name': req.query.name })
  .then((ingress) => res.send(ingress))
  .catch(next);
});

router.get(routes.map((e) => `${e}/:name/status`), validSchema(apiNetworkingK8sIoV1OpenApiV3), (req, res, next) => {
  Ingress.find({ 'metadata.name': req.query.name })
  .then((ingress) => res.send(ingress.status))
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
  .then(() => res.status(201).send(req.body))
  .catch(next);
});

module.exports = router;
