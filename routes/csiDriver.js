const router = require('express').Router();
const { CSIDriver } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/apis/${CSIDriver.apiVersion}/:namespace/csidrivers`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(CSIDriver), general.format(CSIDriver), general.raw(CSIDriver));

router.get(['/api/v1/csidrivers', ...routes], validSchema(apiV1OpenApiV3), general.find(CSIDriver), general.format(CSIDriver), general.list(CSIDriver));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(CSIDriver), general.sendObj(CSIDriver));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(CSIDriver), general.sendObj(CSIDriver));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(CSIDriver), general.sendObj(CSIDriver));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(CSIDriver), general.sendObj(CSIDriver));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(CSIDriver), general.sendObj(CSIDriver));

module.exports = router;
