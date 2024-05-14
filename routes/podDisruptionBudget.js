const router = require('express').Router();
const { PodDisruptionBudget } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${PodDisruptionBudget.apiVersion}/:namespace/poddisruptionbudgets`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(PodDisruptionBudget));

router.get(['/api/v1/poddisruptionbudgets', ...routes], validSchema(apiV1OpenApiV3), general.list(PodDisruptionBudget));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(PodDisruptionBudget));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(PodDisruptionBudget));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(PodDisruptionBudget));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(PodDisruptionBudget));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(PodDisruptionBudget));

module.exports = router;
