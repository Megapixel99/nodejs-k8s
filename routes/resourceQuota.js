const router = require('express').Router();
const { ResourceQuota } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${ResourceQuota.apiVersion}/:namespace/resourcequotas`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(ResourceQuota), general.format(ResourceQuota), general.raw(ResourceQuota));

router.get(['/api/v1/resourcequotas', ...routes], validSchema(apiV1OpenApiV3), general.find(ResourceQuota), general.format(ResourceQuota), general.list(ResourceQuota));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(ResourceQuota));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(ResourceQuota));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(ResourceQuota));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(ResourceQuota));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(ResourceQuota));

module.exports = router;
