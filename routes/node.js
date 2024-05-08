const router = require('express').Router();
const { Node } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenapiV3, validSchema } = openapi;

let routes = ['/apis/apps/v1/namespaces/:namespace/nodes', '/api/v1/namespaces/:namespace/nodes'];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(Node));

router.get(['/api/v1/nodes', ...routes], validSchema(apiV1OpenapiV3), general.list(Node));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(Node));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(Node));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(Node));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(Node));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(Node));

module.exports = router;
