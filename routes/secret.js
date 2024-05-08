const router = require('express').Router();
const { Secret } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

let routes = ['/api/v1/namespaces/:namespace/secrets'];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(Secret));

router.get(['/api/v1/secrets', ...routes], validSchema(apiV1OpenApiV3), general.list(Secret));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(Secret));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(Secret));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(Secret));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(Secret));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(Secret));

module.exports = router;
