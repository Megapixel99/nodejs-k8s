const router = require('express').Router();
const { EndpointSlice } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${EndpointSlice.apiVersion}/:namespace/endpointslices`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(EndpointSlice), general.format(EndpointSlice), general.raw(EndpointSlice));

router.get(['/api/v1/endpointslices', ...routes], validSchema(apiV1OpenApiV3), general.find(EndpointSlice), general.format(EndpointSlice), general.list(EndpointSlice));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(EndpointSlice), general.sendObj(EndpointSlice));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(EndpointSlice), general.sendObj(EndpointSlice));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(EndpointSlice), general.sendObj(EndpointSlice));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(EndpointSlice), general.sendObj(EndpointSlice));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(EndpointSlice), general.sendObj(EndpointSlice));

module.exports = router;
