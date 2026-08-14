const router = require('express').Router();
const { DaemonSet } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, validSchema } = openapi;

let route = `/apis/${DaemonSet.apiVersion}/namespaces/:namespace/daemonsets`;
// `kubectl get <kind> -A` asks for the cluster-wide collection path; only
// the namespaced one was registered, so --all-namespaces 404'd.
const clusterRoute = route.replace('/namespaces/:namespace', '');

router.get(`${route}/:name`, validSchema(apiAppsV1OpenApiV3), general.findOne(DaemonSet), general.format(DaemonSet), general.sendObj(DaemonSet));

router.get([clusterRoute, route], validSchema(apiAppsV1OpenApiV3), general.find(DaemonSet), general.format(DaemonSet), general.list(DaemonSet));

router.post(route, validSchema(apiAppsV1OpenApiV3), general.save(DaemonSet), general.sendObj(DaemonSet));

router.put([`${route}/:name`, route], validSchema(apiAppsV1OpenApiV3), general.update(DaemonSet), general.sendObj(DaemonSet));

router.put(`${route}/:name/status`, validSchema(apiAppsV1OpenApiV3), general.patch(DaemonSet), general.sendObj(DaemonSet));

router.patch(`${route}/:name`, validSchema(apiAppsV1OpenApiV3), general.patch(DaemonSet), general.sendObj(DaemonSet));

router.delete(`${route}/:name`, validSchema(apiAppsV1OpenApiV3), general.deleteOne(DaemonSet), general.sendObj(DaemonSet));

router.delete(route, validSchema(apiAppsV1OpenApiV3), general.delete(DaemonSet), general.sendObj(DaemonSet));

module.exports = router;
