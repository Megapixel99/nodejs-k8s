const router = require('express').Router();
const { Ingress } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiNetworkingK8sIoV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = ['/apis/networking.k8s.io/v1/namespaces/:namespace/ingresses', '/api/v1/namespaces/:namespace/ingresses'];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiNetworkingK8sIoV1OpenApiV3), general.findOne(Ingress));

router.get(['/api/v1/ingresses', ...routes], validSchema(apiV1OpenApiV3), general.list(Ingress));

router.post(routes, validSchema(apiNetworkingK8sIoV1OpenApiV3), general.save(Ingress));

router.put(routes, validSchema(apiNetworkingK8sIoV1OpenApiV3), general.update(Ingress));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiNetworkingK8sIoV1OpenApiV3), general.patch(Ingress));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiNetworkingK8sIoV1OpenApiV3), general.deleteOne(Ingress));

router.delete(routes, validSchema(apiNetworkingK8sIoV1OpenApiV3), general.delete(Ingress));

module.exports = router;
