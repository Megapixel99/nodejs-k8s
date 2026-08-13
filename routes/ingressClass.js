const router = require('express').Router();
const { IngressClass } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiNetworkingK8sIoV1OpenApiV3, validSchema } = openapi;

// IngressClasses are cluster-scoped; keep the namespaced path working too.
const routes = [`/apis/${IngressClass.apiVersion}/ingressclasses`, `/apis/${IngressClass.apiVersion}/:namespace/ingressclasses`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiNetworkingK8sIoV1OpenApiV3), general.findOne(IngressClass), general.format(IngressClass), general.sendObj(IngressClass));

router.get([`/apis/${IngressClass.apiVersion}/ingressclasses`, ...routes], validSchema(apiNetworkingK8sIoV1OpenApiV3), general.find(IngressClass), general.format(IngressClass), general.list(IngressClass));

router.post(routes, validSchema(apiNetworkingK8sIoV1OpenApiV3), general.save(IngressClass), general.sendObj(IngressClass));

router.put([...routes.map((e) => `${e}/:name`), ...routes], validSchema(apiNetworkingK8sIoV1OpenApiV3), general.update(IngressClass), general.sendObj(IngressClass));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiNetworkingK8sIoV1OpenApiV3), general.patch(IngressClass), general.sendObj(IngressClass));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiNetworkingK8sIoV1OpenApiV3), general.deleteOne(IngressClass), general.sendObj(IngressClass));

router.delete(routes, validSchema(apiNetworkingK8sIoV1OpenApiV3), general.delete(IngressClass), general.sendObj(IngressClass));

module.exports = router;
