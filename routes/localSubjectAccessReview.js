const router = require('express').Router();
const { LocalSubjectAccessReview } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/apis/authorization.k8s.io/v1/namespaces/:namespace/localsubjectaccessreviews`];
// `kubectl get <kind> -A` asks for the cluster-wide collection path; only
// the namespaced one was registered, so --all-namespaces 404'd.
const clusterRoutes = routes.map((e) => e.replace('/namespaces/:namespace', ''));

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(LocalSubjectAccessReview), general.format(LocalSubjectAccessReview), general.sendObj(LocalSubjectAccessReview));

router.get([...clusterRoutes, '/api/v1/localsubjectaccessreviews', ...routes], validSchema(apiV1OpenApiV3), general.find(LocalSubjectAccessReview), general.format(LocalSubjectAccessReview), general.list(LocalSubjectAccessReview));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(LocalSubjectAccessReview), general.sendObj(LocalSubjectAccessReview));

router.put([...routes.map((e) => `${e}/:name`), ...routes], validSchema(apiAppsV1OpenApiV3), general.update(LocalSubjectAccessReview), general.sendObj(LocalSubjectAccessReview));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(LocalSubjectAccessReview), general.sendObj(LocalSubjectAccessReview));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(LocalSubjectAccessReview), general.sendObj(LocalSubjectAccessReview));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(LocalSubjectAccessReview), general.sendObj(LocalSubjectAccessReview));

module.exports = router;
