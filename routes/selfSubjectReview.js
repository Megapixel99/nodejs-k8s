const router = require('express').Router();
const { SelfSubjectReview } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

// apiVersion is group-qualified (authentication.k8s.io/v1), so this belongs
// under /apis — mounting it at /api produced a path nothing could reach.
const routes = [`/apis/${SelfSubjectReview.apiVersion}/selfsubjectreviews`];

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(SelfSubjectReview), general.sendObj(SelfSubjectReview));

module.exports = router;
