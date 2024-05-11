const router = require('express').Router();
const { Event } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

let routes = ['/apis/apps/v1/namespaces/:namespace/events', '/api/v1/namespaces/:namespace/events'];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(Event));

router.get(['/api/v1/events', ...routes], validSchema(apiV1OpenApiV3), general.list(Event));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(Event));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(Event));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(Event));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(Event));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(Event));

module.exports = router;
