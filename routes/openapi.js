const router = require('express').Router();
const OpenApiV3 = require('@wesleytodd/openapi');
const ApiV1OpenApiV3 = require('@wesleytodd/openapi');
const openApiV3Spec = require('../openApiSpecs/v3/api.json');
const apiV1OpenApiV3Spec = require('../openApiSpecs/v3/api/v1.json');

const openapiv3 = OpenApiV3(openApiV3Spec);

const apiV1OpenapiV3 = ApiV1OpenApiV3(apiV1OpenApiV3Spec);

router.get('/openapi/v3', (req, res) => res.json(openapiv3.document));
router.get('/openapi/v3/api/v1', (req, res) => res.json(apiV1OpenapiV3.document));

module.exports = {
  router,
  apiV1OpenapiV3
};
