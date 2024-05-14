const router = require('express').Router();
const { DaemonSet } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

let route = `/api/${DaemonSet.apiVersion}/daemonsets`;

router.get(`${route}/:name`, validSchema(apiV1OpenApiV3), general.findOne(DaemonSet));

router.get(`${route}`, validSchema(apiV1OpenApiV3), general.list(DaemonSet));

router.post(route, validSchema(apiV1OpenApiV3), general.save(DaemonSet));

router.put(route, validSchema(apiV1OpenApiV3), general.update(DaemonSet));

router.put(`${route}/:name/status`, validSchema(apiV1OpenApiV3), general.patch(DaemonSet));

router.patch(`${route}/:name`, validSchema(apiV1OpenApiV3), general.patch(DaemonSet));

router.delete(`${route}/:name`, validSchema(apiV1OpenApiV3), general.deleteOne(DaemonSet));

router.delete(route, validSchema(apiV1OpenApiV3), general.delete(DaemonSet));

module.exports = router;
