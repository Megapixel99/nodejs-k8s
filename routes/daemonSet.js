const router = require('express').Router();
const { DaemonSets } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

let route = '/api/v1/daemonsets';

router.get(`${route}/:name`, validSchema(apiV1OpenApiV3), general.findOne(DaemonSets));

router.get(`${route}`, validSchema(apiV1OpenApiV3), general.list(DaemonSets));

router.post(route, validSchema(apiV1OpenApiV3), general.save(DaemonSets));

router.put(route, validSchema(apiV1OpenApiV3), general.update(DaemonSets));

router.put(`${route}/:name/status`, validSchema(apiV1OpenApiV3), general.patch(DaemonSets));

router.patch(`${route}/:name`, validSchema(apiV1OpenApiV3), general.patch(DaemonSets));

router.delete(`${route}/:name`, validSchema(apiV1OpenApiV3), general.deleteOne(DaemonSets));

router.delete(route, validSchema(apiV1OpenApiV3), general.delete(DaemonSets));

module.exports = router;
