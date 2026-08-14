const router = require('express').Router();
const { Deployment } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, validSchema } = openapi;

let routes = [`/apis/${Deployment.apiVersion}/namespaces/:namespace/deployments`];
// `kubectl get <kind> -A` asks for the cluster-wide collection path; only
// the namespaced one was registered, so --all-namespaces 404'd.
const clusterRoutes = routes.map((e) => e.replace('/namespaces/:namespace', ''));

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(Deployment), general.format(Deployment), general.sendObj(Deployment));

router.get([...clusterRoutes, `/apis/${Deployment.apiVersion}/deployments`, ...routes], validSchema(apiAppsV1OpenApiV3), general.find(Deployment), general.format(Deployment), general.list(Deployment));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(Deployment), general.sendObj(Deployment));

router.put([...routes.map((e) => `${e}/:name`), ...routes], validSchema(apiAppsV1OpenApiV3), general.update(Deployment), general.sendObj(Deployment));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(Deployment), general.sendObj(Deployment));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(Deployment), general.sendObj(Deployment));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(Deployment), general.sendObj(Deployment));

// `kubectl scale` reads and writes the scale subresource, not the object.
router.get(routes.map((e) => `${e}/:name/scale`), general.getScale(Deployment));
router.put(routes.map((e) => `${e}/:name/scale`), general.setScale(Deployment));
router.patch(routes.map((e) => `${e}/:name/scale`), general.setScale(Deployment));

module.exports = router;
