const router = require('express').Router();
const { LocalSubjectAccessReview } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${LocalSubjectAccessReview.apiVersion}/:namespace/localsubjectaccessreviews`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(LocalSubjectAccessReview));

router.get(['/api/v1/localsubjectaccessreviews', ...routes], validSchema(apiV1OpenApiV3), general.list(LocalSubjectAccessReview));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(LocalSubjectAccessReview));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(LocalSubjectAccessReview));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(LocalSubjectAccessReview));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(LocalSubjectAccessReview));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(LocalSubjectAccessReview));

module.exports = router;
