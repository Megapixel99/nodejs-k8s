const router = require('express').Router();
const { HorizontalPodAutoscaler } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${HorizontalPodAutoscaler.apiVersion}/:namespace/horizontalpodautoscalers`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(HorizontalPodAutoscaler), general.format(HorizontalPodAutoscaler), general.raw(HorizontalPodAutoscaler));

router.get(['/api/v1/horizontalpodautoscalers', ...routes], validSchema(apiV1OpenApiV3), general.find(HorizontalPodAutoscaler), general.format(HorizontalPodAutoscaler), general.list(HorizontalPodAutoscaler));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(HorizontalPodAutoscaler), general.sendObj(HorizontalPodAutoscaler));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(HorizontalPodAutoscaler), general.sendObj(HorizontalPodAutoscaler));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(HorizontalPodAutoscaler), general.sendObj(HorizontalPodAutoscaler));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(HorizontalPodAutoscaler), general.sendObj(HorizontalPodAutoscaler));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(HorizontalPodAutoscaler), general.sendObj(HorizontalPodAutoscaler));

module.exports = router;
