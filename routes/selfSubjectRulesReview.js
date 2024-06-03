const router = require('express').Router();
const { SelfSubjectRulesReview } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${SelfSubjectRulesReview.apiVersion}/:namespace/selfsubjectreviews`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(SelfSubjectRulesReview), general.format(SelfSubjectRulesReview), general.raw(SelfSubjectRulesReview));

router.get(['/api/v1/selfsubjectrulesreviews', ...routes], validSchema(apiV1OpenApiV3), general.find(SelfSubjectRulesReview), general.format(SelfSubjectRulesReview), general.list(SelfSubjectRulesReview));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(SelfSubjectRulesReview), general.sendObj(SelfSubjectRulesReview));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(SelfSubjectRulesReview), general.sendObj(SelfSubjectRulesReview));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(SelfSubjectRulesReview), general.sendObj(SelfSubjectRulesReview));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(SelfSubjectRulesReview), general.sendObj(SelfSubjectRulesReview));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(SelfSubjectRulesReview), general.sendObj(SelfSubjectRulesReview));

module.exports = router;
