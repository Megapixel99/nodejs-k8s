const router = require('express').Router();
const { DaemonSet } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, validSchema } = openapi;

let route = `/apis/${DaemonSet.apiVersion}/namespaces/:namespace/daemonsets`;

router.get(`${route}/:name`, validSchema(apiAppsV1OpenApiV3), general.findOne(DaemonSet), general.format(DaemonSet), general.raw(DaemonSet));

router.get(`${route}`, validSchema(apiAppsV1OpenApiV3), general.find(DaemonSet), general.format(DaemonSet), general.list(DaemonSet));

router.post(route, validSchema(apiAppsV1OpenApiV3), general.save(DaemonSet), general.sendObj(DaemonSet));

router.put(route, validSchema(apiAppsV1OpenApiV3), general.save(DaemonSet), general.sendObj(DaemonSet));

router.put(`${route}/:name/status`, validSchema(apiAppsV1OpenApiV3), general.save(DaemonSet), general.sendObj(DaemonSet));

router.patch(`${route}/:name`, validSchema(apiAppsV1OpenApiV3), general.save(DaemonSet), general.sendObj(DaemonSet));

router.delete(`${route}/:name`, validSchema(apiAppsV1OpenApiV3), general.save(DaemonSet), general.sendObj(DaemonSet));

router.delete(route, validSchema(apiAppsV1OpenApiV3), general.save(DaemonSet), general.sendObj(DaemonSet));

module.exports = router;
