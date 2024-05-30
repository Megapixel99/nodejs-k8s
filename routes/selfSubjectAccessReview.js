const router = require('express').Router();
const { SelfSubjectAccessReview } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${SelfSubjectAccessReview.apiVersion}/:namespace/selfsubjectaccessreviews`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(SelfSubjectAccessReview), general.format(SelfSubjectAccessReview), general.raw(SelfSubjectAccessReview));

router.get(['/api/v1/selfsubjectaccessreviews', ...routes], validSchema(apiV1OpenApiV3), general.find(SelfSubjectAccessReview), general.format(SelfSubjectAccessReview), general.list(SelfSubjectAccessReview));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(SelfSubjectAccessReview));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(SelfSubjectAccessReview));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(SelfSubjectAccessReview));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(SelfSubjectAccessReview));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(SelfSubjectAccessReview));

module.exports = router;
