const router = require('express').Router();
const { ConfigMap } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

let routes = [`/api/${ConfigMap.apiVersion}/namespaces/:namespace/configmaps`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(ConfigMap), general.format(ConfigMap), general.raw(ConfigMap));

router.get(['/api/v1/configmaps', ...routes], validSchema(apiV1OpenApiV3), general.find(ConfigMap), general.format(ConfigMap), general.list(ConfigMap));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(ConfigMap));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(ConfigMap));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(ConfigMap));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(ConfigMap));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(ConfigMap));

module.exports = router;
