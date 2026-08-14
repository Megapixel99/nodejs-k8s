const router = require('express').Router();
const { PodDisruptionBudget } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/apis/policy/v1/namespaces/:namespace/poddisruptionbudgets`];
// `kubectl get <kind> -A` asks for the cluster-wide collection path; only
// the namespaced one was registered, so --all-namespaces 404'd.
const clusterRoutes = routes.map((e) => e.replace('/namespaces/:namespace', ''));

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(PodDisruptionBudget), general.format(PodDisruptionBudget), general.sendObj(PodDisruptionBudget));

router.get([...clusterRoutes, '/api/v1/poddisruptionbudgets', '/apis/policy/v1/poddisruptionbudgets', ...routes], validSchema(apiV1OpenApiV3), general.find(PodDisruptionBudget), general.format(PodDisruptionBudget), general.list(PodDisruptionBudget));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(PodDisruptionBudget), general.sendObj(PodDisruptionBudget));

router.put([...routes.map((e) => `${e}/:name`), ...routes], validSchema(apiAppsV1OpenApiV3), general.update(PodDisruptionBudget), general.sendObj(PodDisruptionBudget));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(PodDisruptionBudget), general.sendObj(PodDisruptionBudget));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(PodDisruptionBudget), general.sendObj(PodDisruptionBudget));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(PodDisruptionBudget), general.sendObj(PodDisruptionBudget));

// Cluster-scoped list / deletecollection endpoints (the DisruptionController
// conformance test lists PDBs across all namespaces).
router.delete(['/apis/policy/v1/poddisruptionbudgets'], general.delete(PodDisruptionBudget), general.sendObj(PodDisruptionBudget));

module.exports = router;
