const router = require('express').Router();
const { Service } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenapiV3, validSchema } = openapi;

let routes = ['/apis/apps/v1/namespaces/:namespace/services', '/api/v1/namespaces/:namespace/services'];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(Service));

router.get(['/api/v1/services', ...routes], validSchema(apiV1OpenapiV3), general.list(Service));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(Service));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(Service));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(Service));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(Service));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(Service));

module.exports = router;
