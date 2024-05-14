const router = require('express').Router();
const { SelfSubjectRulesReview } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${SelfSubjectRulesReview.apiVersion}/:namespace/selfsubjectreviews`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(SelfSubjectRulesReview));

router.get(['/api/v1/selfsubjectrulesreviews', ...routes], validSchema(apiV1OpenApiV3), general.list(SelfSubjectRulesReview));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(SelfSubjectRulesReview));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(SelfSubjectRulesReview));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(SelfSubjectRulesReview));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(SelfSubjectRulesReview));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(SelfSubjectRulesReview));

module.exports = router;