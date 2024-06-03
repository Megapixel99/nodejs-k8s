const router = require('express').Router();
const { SelfSubjectReview } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${SelfSubjectReview.apiVersion}/selfsubjectreviews`];

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(SelfSubjectReview), general.sendObj(SelfSubjectReview));

module.exports = router;
