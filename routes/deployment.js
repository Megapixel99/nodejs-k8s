const router = require('express').Router();
const { Deployment } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

let routes = ['/apis/apps/v1/namespaces/:namespace/deployments', '/api/v1/namespaces/:namespace/deployments'];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(Deployment));

router.get(['/api/v1/deployments', ...routes], validSchema(apiV1OpenApiV3), general.list(Deployment));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(Deployment));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(Deployment));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(Deployment));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(Deployment));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(Deployment));

module.exports = router;
