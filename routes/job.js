const router = require('express').Router();
const { Job } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${Job.apiVersion}/:namespace/jobs`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(Job));

router.get(['/api/v1/jobs', ...routes], validSchema(apiV1OpenApiV3), general.list(Job));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(Job));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(Job));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(Job));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(Job));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(Job));

module.exports = router;
