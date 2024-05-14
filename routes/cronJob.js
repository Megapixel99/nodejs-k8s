const router = require('express').Router();
const { CronJob } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${CronJob.apiVersion}/:namespace/cronjobs`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(CronJob));

router.get(['/api/v1/cronjobs', ...routes], validSchema(apiV1OpenApiV3), general.list(CronJob));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(CronJob));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(CronJob));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(CronJob));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(CronJob));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(CronJob));

module.exports = router;
