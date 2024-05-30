const router = require('express').Router();
const { CSINode } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${CSINode.apiVersion}/:namespace/csinodes`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(CSINode), general.format(CSINode), general.raw(CSINode));

router.get(['/api/v1/csinodes', ...routes], validSchema(apiV1OpenApiV3), general.find(CSINode), general.format(CSINode), general.list(CSINode));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(CSINode));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(CSINode));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(CSINode));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(CSINode));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(CSINode));

module.exports = router;
