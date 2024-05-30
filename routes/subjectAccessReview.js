const router = require('express').Router();
const { SubjectAccessReview } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${SubjectAccessReview.apiVersion}/:namespace/subjectaccessreviews`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(SubjectAccessReview), general.format(SubjectAccessReview), general.raw(SubjectAccessReview));

router.get(['/api/v1/subjectaccessreviews', ...routes], validSchema(apiV1OpenApiV3), general.find(SubjectAccessReview), general.format(SubjectAccessReview), general.list(SubjectAccessReview));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(SubjectAccessReview));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(SubjectAccessReview));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(SubjectAccessReview));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(SubjectAccessReview));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(SubjectAccessReview));

module.exports = router;
