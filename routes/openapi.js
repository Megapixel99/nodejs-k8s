const router = require('express').Router();
const {
  openapiv3,
  apiV1OpenapiV3,
  apiNetworkingK8sIoV1OpenApiV3,
  apiAppsV1OpenApiV3,
} = require('../middleware/openapi.js');

router.get('/openapi/v3', (req, res) => res.json(openapiv3.document));
router.get('/openapi/v3/apis/apps/v1', (req, res) => res.json(apiAppsV1OpenApiV3.document));
router.get(['/openapi/v3/apis/networking.k8s.io/v1', '/apis/networking.k8s.io/v1'], (req, res) => res.json(apiNetworkingK8sIoV1OpenApiV3.document));
router.get('/openapi/v3/api/v1', (req, res) => res.json(apiV1OpenapiV3.document));

module.exports = router;
