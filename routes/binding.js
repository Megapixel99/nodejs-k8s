const router = require('express').Router();
const { Binding } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${Binding.apiVersion}/:namespace/bindings`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(Binding));

router.get(['/api/v1/bindings', ...routes], validSchema(apiV1OpenApiV3), general.list(Binding));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(Binding));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(Binding));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(Binding));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(Binding));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(Binding));

module.exports = router;
