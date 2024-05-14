const router = require('express').Router();
const { ServiceAccount } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${ServiceAccount.apiVersion}/namespaces/:namespace/serviceaccounts`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(ServiceAccount));

router.get(['/api/v1/serviceaccounts', ...routes], validSchema(apiV1OpenApiV3), general.list(ServiceAccount));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(ServiceAccount));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(ServiceAccount));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(ServiceAccount));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(ServiceAccount));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(ServiceAccount));

module.exports = router;
