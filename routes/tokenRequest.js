const router = require('express').Router();
const { TokenRequest } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${TokenRequest.apiVersion}/namespaces/:namespace/serviceaccounts/:name/token`];

router.post(routes, validSchema(apiV1OpenApiV3), general.save(TokenRequest), general.sendObj(TokenRequest));

module.exports = router;
