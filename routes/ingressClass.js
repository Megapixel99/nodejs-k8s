const router = require('express').Router();
const { IngressClass } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiNetworkingK8sIoV1OpenApiV3, validSchema } = openapi;

const routes = [`/apis/${IngressClass.apiVersion}/:namespace/ingressclasses`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiNetworkingK8sIoV1OpenApiV3), general.findOne(IngressClass), general.format(IngressClass), general.raw(IngressClass));

router.get([`/apis/${IngressClass.apiVersion}/ingressclasses`, ...routes], validSchema(apiNetworkingK8sIoV1OpenApiV3), general.find(IngressClass), general.format(IngressClass), general.list(IngressClass));

router.post(routes, validSchema(apiNetworkingK8sIoV1OpenApiV3), general.save(IngressClass), general.sendObj(IngressClass));

router.put(routes, validSchema(apiNetworkingK8sIoV1OpenApiV3), general.save(IngressClass), general.sendObj(IngressClass));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiNetworkingK8sIoV1OpenApiV3), general.save(IngressClass), general.sendObj(IngressClass));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiNetworkingK8sIoV1OpenApiV3), general.save(IngressClass), general.sendObj(IngressClass));

router.delete(routes, validSchema(apiNetworkingK8sIoV1OpenApiV3), general.save(IngressClass), general.sendObj(IngressClass));

module.exports = router;
