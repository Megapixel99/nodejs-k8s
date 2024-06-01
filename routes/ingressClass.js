const router = require('express').Router();
const { IngressClass } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiNetworkingK8sIoV1OpenApiV3, validSchema } = openapi;

const routes = [`/apis/${IngressClass.apiVersion}/:namespace/ingressclasses`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiNetworkingK8sIoV1OpenApiV3), general.findOne(IngressClass), general.format(IngressClass), general.raw(IngressClass));

router.get([`/apis/${IngressClass.apiVersion}/ingressclasses`, ...routes], validSchema(apiNetworkingK8sIoV1OpenApiV3), general.find(IngressClass), general.format(IngressClass), general.list(IngressClass));

router.post(routes, validSchema(apiNetworkingK8sIoV1OpenApiV3), general.save(IngressClass));

router.put(routes, validSchema(apiNetworkingK8sIoV1OpenApiV3), general.update(IngressClass));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiNetworkingK8sIoV1OpenApiV3), general.patch(IngressClass));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiNetworkingK8sIoV1OpenApiV3), general.deleteOne(IngressClass));

router.delete(routes, validSchema(apiNetworkingK8sIoV1OpenApiV3), general.delete(IngressClass));

module.exports = router;
