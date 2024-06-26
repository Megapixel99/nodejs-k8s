const router = require('express').Router();
const { Pod } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenapiV3, validSchema } = openapi;

let routes = ['/apis/apps/v1/namespaces/:namespace/pods', '/api/v1/namespaces/:namespace/pods'];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(Pod));

router.get(['/api/v1/pods', ...routes], validSchema(apiV1OpenapiV3), general.list(Pod));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(Pod));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(Pod));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(Pod));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(Pod));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(Pod));

module.exports = router;
