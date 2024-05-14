const router = require('express').Router();
const { HorizontalPodAutoscaler } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${HorizontalPodAutoscaler.apiVersion}/:namespace/horizontalpodautoscalers`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(HorizontalPodAutoscaler));

router.get(['/api/v1/horizontalpodautoscalers', ...routes], validSchema(apiV1OpenApiV3), general.list(HorizontalPodAutoscaler));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(HorizontalPodAutoscaler));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(HorizontalPodAutoscaler));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(HorizontalPodAutoscaler));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(HorizontalPodAutoscaler));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(HorizontalPodAutoscaler));

module.exports = router;
