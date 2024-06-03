const router = require('express').Router();
const { Job } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${Job.apiVersion}/:namespace/jobs`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(Job), general.format(Job), general.raw(Job));

router.get(['/api/v1/jobs', ...routes], validSchema(apiV1OpenApiV3), general.find(Job), general.format(Job), general.list(Job));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(Job), general.sendObj(Job));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(Job), general.sendObj(Job));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(Job), general.sendObj(Job));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(Job), general.sendObj(Job));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(Job), general.sendObj(Job));

module.exports = router;
