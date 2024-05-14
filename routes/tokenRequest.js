const router = require('express').Router();
const { TokenRequest } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/v1/namespaces/:namespace/serviceaccounts/:name/token`];

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(TokenRequest));

module.exports = router;
