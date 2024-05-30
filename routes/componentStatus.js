const router = require('express').Router();
const { ComponentStatus } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/apis/${ComponentStatus.apiVersion}/componentstatuses`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(ComponentStatus), general.format(ComponentStatus), general.raw(ComponentStatus));

router.get(['/api/v1/componentstatuses', ...routes], validSchema(apiV1OpenApiV3), general.find(ComponentStatus), general.format(ComponentStatus), general.list(ComponentStatus));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(ComponentStatus));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(ComponentStatus));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(ComponentStatus));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(ComponentStatus));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(ComponentStatus));

module.exports = router;
