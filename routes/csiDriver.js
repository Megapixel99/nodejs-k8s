const router = require('express').Router();
const { CSIDriver } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${CSIDriver.apiVersion}/:namespace/csidriver`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(CSIDriver));

router.get(['/api/v1/csidrivers', ...routes], validSchema(apiV1OpenApiV3), general.list(CSIDriver));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(CSIDriver));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(CSIDriver));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(CSIDriver));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(CSIDriver));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(CSIDriver));

module.exports = router;
