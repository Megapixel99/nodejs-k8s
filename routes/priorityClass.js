const router = require('express').Router();
const { PriorityClass } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${PriorityClass.apiVersion}/:namespace/priorityclasses`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(PriorityClass), general.format(PriorityClass), general.raw(PriorityClass));

router.get(['/api/v1/priorityclasses', ...routes], validSchema(apiV1OpenApiV3), general.find(PriorityClass), general.format(PriorityClass), general.list(PriorityClass));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(PriorityClass));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(PriorityClass));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(PriorityClass));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(PriorityClass));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(PriorityClass));

module.exports = router;
