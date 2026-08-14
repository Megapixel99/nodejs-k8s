const router = require('express').Router();
const { CronJob } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/apis/batch/v1/namespaces/:namespace/cronjobs`];
// `kubectl get <kind> -A` asks for the cluster-wide collection path; only
// the namespaced one was registered, so --all-namespaces 404'd.
const clusterRoutes = routes.map((e) => e.replace('/namespaces/:namespace', ''));

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(CronJob), general.format(CronJob), general.sendObj(CronJob));

router.get([...clusterRoutes, '/api/v1/cronjobs', ...routes], validSchema(apiV1OpenApiV3), general.find(CronJob), general.format(CronJob), general.list(CronJob));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(CronJob), general.sendObj(CronJob));

router.put([...routes.map((e) => `${e}/:name`), ...routes], validSchema(apiAppsV1OpenApiV3), general.update(CronJob), general.sendObj(CronJob));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(CronJob), general.sendObj(CronJob));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(CronJob), general.sendObj(CronJob));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(CronJob), general.sendObj(CronJob));

module.exports = router;
