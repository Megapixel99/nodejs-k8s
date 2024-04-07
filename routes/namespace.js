const router = require('express').Router();
const { Namespace } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenapiV3, validSchema } = openapi;

let routes = ['/api/v1/namespaces'];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(Namespace));

router.get(routes, validSchema(apiV1OpenapiV3), general.list(Namespace));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(Namespace));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(Namespace));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(Namespace));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(Namespace));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(Namespace));

module.exports = router;
