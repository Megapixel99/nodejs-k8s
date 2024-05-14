const router = require('express').Router();
const { StatefulSet } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${StatefulSet.apiVersion}/:namespace/statefulsets`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(StatefulSet));

router.get(['/api/v1/statefulsets', ...routes], validSchema(apiV1OpenApiV3), general.list(StatefulSet));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(StatefulSet));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(StatefulSet));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(StatefulSet));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(StatefulSet));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(StatefulSet));

module.exports = router;
