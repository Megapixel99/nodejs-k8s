const router = require('express').Router();
const { Event } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiV1OpenApiV3, validSchema } = openapi;

let routes = [`/api/v1/namespaces/:namespace/events`];
// `kubectl get <kind> -A` asks for the cluster-wide collection path; only
// the namespaced one was registered, so --all-namespaces 404'd.
const clusterRoutes = routes.map((e) => e.replace('/namespaces/:namespace', ''));

router.get(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.findOne(Event), general.format(Event), general.sendObj(Event));

router.get([...clusterRoutes, '/api/v1/events', ...routes], validSchema(apiV1OpenApiV3), general.find(Event), general.format(Event), general.list(Event));

router.post(routes, validSchema(apiV1OpenApiV3), general.save(Event), general.sendObj(Event));

router.put([...routes.map((e) => `${e}/:name`), ...routes], validSchema(apiV1OpenApiV3), general.update(Event), general.sendObj(Event));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.patch(Event), general.sendObj(Event));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.deleteOne(Event), general.sendObj(Event));

router.delete(routes, validSchema(apiV1OpenApiV3), general.delete(Event), general.sendObj(Event));

module.exports = router;
