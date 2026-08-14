const router = require('express').Router();
const { PodTemplate } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${PodTemplate.apiVersion}/namespaces/:namespace/podtemplates`];
// `kubectl get <kind> -A` asks for the cluster-wide collection path; only
// the namespaced one was registered, so --all-namespaces 404'd.
const clusterRoutes = routes.map((e) => e.replace('/namespaces/:namespace', ''));

router.get(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.findOne(PodTemplate), general.format(PodTemplate), general.sendObj(PodTemplate));

router.get([...clusterRoutes, '/api/v1/podtemplates', ...routes], validSchema(apiV1OpenApiV3), general.find(PodTemplate), general.format(PodTemplate), general.list(PodTemplate));

router.post(routes, validSchema(apiV1OpenApiV3), general.save(PodTemplate), general.sendObj(PodTemplate));

router.put([...routes.map((e) => `${e}/:name`), ...routes], validSchema(apiV1OpenApiV3), general.update(PodTemplate), general.sendObj(PodTemplate));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.patch(PodTemplate), general.sendObj(PodTemplate));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.deleteOne(PodTemplate), general.sendObj(PodTemplate));

router.delete(routes, validSchema(apiV1OpenApiV3), general.delete(PodTemplate), general.sendObj(PodTemplate));

module.exports = router;
