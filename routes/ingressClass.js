const router = require('express').Router();
const { IngressClass } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${IngressClass.apiVersion}/:namespace/ingressclasses`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(IngressClass));

router.get(['/api/v1/ingressclasses', ...routes], validSchema(apiV1OpenApiV3), general.list(IngressClass));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(IngressClass));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(IngressClass));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(IngressClass));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(IngressClass));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(IngressClass));

module.exports = router;
