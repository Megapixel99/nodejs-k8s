const router = require('express').Router();
const OpenApi = require('@wesleytodd/openapi');
const OpenApiV3 = require('@wesleytodd/openapi');
const ApiV1OpenApiV3 = require('@wesleytodd/openapi');
const ApiNetworkingK8sIoV1OpenApiV3 = require('@wesleytodd/openapi');
const ApiAppsV1OpenApiV3 = require('@wesleytodd/openapi');
const openApiV3Spec = require('../openApiSpecs/v3/api.json');
const apiV1OpenApiV3Spec = require('../openApiSpecs/v3/api/v1.json');
const apiNetworkingK8sIoV1OpenApiV3Spec = require('../openApiSpecs/v3/apis/networking.k8s.io/v1.json');
const apiAppsV1OpenApiV3Spec = require('../openApiSpecs/v3/apis/apps/v1.json');

const openapi = new OpenApi({
  openapi: "3.0.0",
});

const openapiv3 = OpenApiV3(openApiV3Spec);

const apiV1OpenapiV3 = ApiV1OpenApiV3(apiV1OpenApiV3Spec);

const apiNetworkingK8sIoV1OpenApiV3 = ApiNetworkingK8sIoV1OpenApiV3(apiNetworkingK8sIoV1OpenApiV3Spec);

const apiAppsV1OpenApiV3 = ApiAppsV1OpenApiV3(apiAppsV1OpenApiV3Spec);

router.get('/openapi/v3', (req, res) => res.json(openapiv3.document));
router.get('/openapi/v3/apis/apps/v1', (req, res) => res.json(apiAppsV1OpenApiV3.document));
router.get(['/openapi/v3/apis/networking.k8s.io/v1', '/apis/networking.k8s.io/v1'], (req, res) => res.json(apiNetworkingK8sIoV1OpenApiV3.document));
router.get('/openapi/v3/api/v1', (req, res) => res.json(apiV1OpenapiV3.document));

module.exports = {
  router,
  apiV1OpenapiV3,
  apiNetworkingK8sIoV1OpenApiV3,
  apiAppsV1OpenApiV3,
  validSchema: (schema) => {
    return (req, res, next) => {
      let path = Object.keys(schema.document.paths)
        .filter((e) => {
          let r = new RegExp(e.replace(/\{.*?\}/ig, '.*?'));
          if (req.baseUrl.match(r)?.length === 1) {
            return Object.keys(schema.document.paths);
          }
        })
        .reverse()
        .at(0);
      return openapi.validPath(schema.document.paths[path])(req, res, next);
    };
  }
};
