const router = require('express').Router();
const { Endpoints } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/apis/${Endpoints.apiVersion}/namespaces/:namespace/endpointses`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(Endpoints));

router.get(['/api/v1/endpointses', ...routes], validSchema(apiV1OpenApiV3), general.list(Endpoints));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(Endpoints));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(Endpoints));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(Endpoints));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(Endpoints));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(Endpoints));

module.exports = router;
