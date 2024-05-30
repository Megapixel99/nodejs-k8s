const router = require('express').Router();
const { RuntimeClass } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/apis/${RuntimeClass.apiVersion}/runtimeclasses`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(RuntimeClass), general.format(RuntimeClass), general.raw(RuntimeClass));

router.get(['/api/v1/runtimeclasses', ...routes], validSchema(apiV1OpenApiV3), general.find(RuntimeClass), general.format(RuntimeClass), general.list(RuntimeClass));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(RuntimeClass));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(RuntimeClass));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(RuntimeClass));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(RuntimeClass));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(RuntimeClass));

module.exports = router;
