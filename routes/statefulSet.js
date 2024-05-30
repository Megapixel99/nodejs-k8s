const router = require('express').Router();
const { StatefulSet } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/apis/${StatefulSet.apiVersion}/namespaces/:namespace/statefulsets`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(StatefulSet), general.format(StatefulSet), general.raw(StatefulSet));

router.get(['/api/v1/statefulsets', ...routes], validSchema(apiV1OpenApiV3), general.find(StatefulSet), general.format(StatefulSet), general.list(StatefulSet));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(StatefulSet));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(StatefulSet));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(StatefulSet));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(StatefulSet));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(StatefulSet));

module.exports = router;
