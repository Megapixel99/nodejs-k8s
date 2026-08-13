const router = require('express').Router();
const { Service } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiV1OpenApiV3, validSchema } = openapi;

let routes = [`/api/${Service.apiVersion}/namespaces/:namespace/services`];
// `kubectl get <kind> -A` asks for the cluster-wide collection path; only
// the namespaced one was registered, so --all-namespaces 404'd.
const clusterRoutes = routes.map((e) => e.replace('/namespaces/:namespace', ''));

router.get(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.findOne(Service), general.format(Service), general.sendObj(Service));

router.get([...clusterRoutes, '/api/v1/services', ...routes], validSchema(apiV1OpenApiV3), general.find(Service), general.format(Service), general.list(Service));

router.post(routes, validSchema(apiV1OpenApiV3), general.save(Service), general.sendObj(Service));

router.put([...routes.map((e) => `${e}/:name`), ...routes], validSchema(apiV1OpenApiV3), general.update(Service), general.sendObj(Service));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.patch(Service), general.sendObj(Service));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.deleteOne(Service), general.sendObj(Service));

router.delete(routes, validSchema(apiV1OpenApiV3), general.delete(Service), general.sendObj(Service));

module.exports = router;
