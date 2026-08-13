const router = require('express').Router();
const { ConfigMap } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

let routes = [`/api/${ConfigMap.apiVersion}/namespaces/:namespace/configmaps`];
// `kubectl get <kind> -A` asks for the cluster-wide collection path; only
// the namespaced one was registered, so --all-namespaces 404'd.
const clusterRoutes = routes.map((e) => e.replace('/namespaces/:namespace', ''));

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(ConfigMap), general.format(ConfigMap), general.sendObj(ConfigMap));

router.get([...clusterRoutes, `/api/${ConfigMap.apiVersion}/configmaps`, ...routes], validSchema(apiV1OpenApiV3), general.find(ConfigMap), general.format(ConfigMap), general.list(ConfigMap));

router.post(routes, validSchema(apiV1OpenApiV3), general.save(ConfigMap), general.sendObj(ConfigMap));

router.put([...routes.map((e) => `${e}/:name`), ...routes], validSchema(apiV1OpenApiV3), general.update(ConfigMap), general.sendObj(ConfigMap));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.patch(ConfigMap), general.sendObj(ConfigMap));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.deleteOne(ConfigMap), general.sendObj(ConfigMap));

router.delete(routes, validSchema(apiV1OpenApiV3), general.delete(ConfigMap), general.sendObj(ConfigMap));

module.exports = router;
