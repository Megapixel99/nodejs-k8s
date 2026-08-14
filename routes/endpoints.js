const router = require('express').Router();
const { Endpoints } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiV1OpenApiV3, validSchema } = openapi;

// Endpoints is a core resource; it was only reachable under the group path.
// Endpoints is core; the group path is the legacy one this server used.
const routes = [`/api/${Endpoints.apiVersion}/namespaces/:namespace/endpoints`, `/apis/networking.k8s.io/v1/namespaces/:namespace/endpoints`];
// `kubectl get <kind> -A` asks for the cluster-wide collection path; only
// the namespaced one was registered, so --all-namespaces 404'd.
const clusterRoutes = routes.map((e) => e.replace('/namespaces/:namespace', ''));

router.get(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.findOne(Endpoints), general.format(Endpoints), general.sendObj(Endpoints));

router.get([...clusterRoutes, '/api/v1/endpoints', ...routes], validSchema(apiV1OpenApiV3), general.find(Endpoints), general.format(Endpoints), general.list(Endpoints));

router.post(routes, validSchema(apiV1OpenApiV3), general.save(Endpoints), general.sendObj(Endpoints));

router.put([...routes.map((e) => `${e}/:name`), ...routes], validSchema(apiV1OpenApiV3), general.update(Endpoints), general.sendObj(Endpoints));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.patch(Endpoints), general.sendObj(Endpoints));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.deleteOne(Endpoints), general.sendObj(Endpoints));

router.delete(routes, validSchema(apiV1OpenApiV3), general.delete(Endpoints), general.sendObj(Endpoints));

module.exports = router;
