const OpenApi = require('@wesleytodd/openapi');
const OpenApiV3 = require('@wesleytodd/openapi');
const ApiV1OpenApiV3 = require('@wesleytodd/openapi');
const ApiNetworkingK8sIoV1OpenApiV3 = require('@wesleytodd/openapi');
const ApiAppsV1OpenApiV3 = require('@wesleytodd/openapi');
const ApiRbacAuthorizatonK8sIoV1OpenApiV3 = require('@wesleytodd/openapi');
const ApiCertificatesK8sIoApiV3 = require('@wesleytodd/openapi');
const openApiV3Spec = require('../openApiSpecs/v3/api.json');
const apiV1OpenApiV3Spec = require('../openApiSpecs/v3/api/v1.json');
const apiNetworkingK8sIoV1OpenApiV3Spec = require('../openApiSpecs/v3/apis/networking.k8s.io/v1.json');
const apiAppsV1OpenApiV3Spec = require('../openApiSpecs/v3/apis/apps/v1.json');
const apiRbacAuthorizatonK8sIoV1OpenApiV3Spec = require('../openApiSpecs/v3/apis/rbac.authorization.k8s.io/v1.json');
const apiCertificatesK8sIoApiV3Spec = require('../openApiSpecs/v3/apis/certificates.k8s.io/v1.json');

const openapi = new OpenApi({
  openapi: "3.0.0",
});

module.exports = {
  openapiv3: OpenApiV3(openApiV3Spec),
  apiV1OpenApiV3: ApiV1OpenApiV3(apiV1OpenApiV3Spec),
  apiNetworkingK8sIoV1OpenApiV3: ApiNetworkingK8sIoV1OpenApiV3(apiNetworkingK8sIoV1OpenApiV3Spec),
  apiAppsV1OpenApiV3: ApiAppsV1OpenApiV3(apiAppsV1OpenApiV3Spec),
  apiRbacAuthorizatonK8sIoV1OpenApiV3: ApiNetworkingK8sIoV1OpenApiV3(apiRbacAuthorizatonK8sIoV1OpenApiV3Spec),
  apiCertificatesK8sIoApiV3: ApiAppsV1OpenApiV3(apiCertificatesK8sIoApiV3Spec),
  validSchema: (schema) => {
    return (req, res, next) => {
      let paths = [req.route.path]
        .flat(Infinity)
        .filter((p) => typeof p === 'string')
        .map((p) => {
          return p
           .split('/')
           .map((e) => e.charAt(0) === ':' ? `{${e.substring(1, e.length)}}` : e)
           .join('/');
        })
      let path = Object.keys(schema.document.paths).find((key) => (req.path.match(/\//g) || []).length === (key.match(/\//g) || []).length && paths.includes(key) && schema.document.paths[key]?.[req.method.toLowerCase()]);
      if (req.headers?.accept?.includes(';')) {
        type = req.headers?.accept?.split(';')?.[0];
      } else if (req.headers?.accept?.includes(',')) {
        type = req.headers?.accept?.split(',')?.[0];
      } else {
        type = req.headers?.accept;
      }
      if (!['application/json', 'application/vnd.kubernetes.protobuf', 'application/yaml'].includes(req.headers?.accept)) {
        type = 'application/json';
      }
      req.operationId = schema.document.paths?.[path]?.[req.method.toLowerCase()].requestBody?.content?.['*/*']?.schema?.['$ref']?.split('.')?.at(-1);
      res.operationId = schema.document.paths?.[path]?.[req.method.toLowerCase()].responses?.['200']?.content?.[type?.trim()]?.schema?.['$ref']?.split('.')?.at(-1);
      // An RFC 6902 patch body is an array of ops, but every request schema
      // here declares body as an object, so the validator failed it — and a
      // validation failure surfaces as a 500. The ops are validated by the
      // patch middleware that applies them.
      if (`${req.headers['content-type']}`.includes('json-patch+json')) {
        return next();
      }
      return openapi.validPath(schema.document.paths[path])(req, res, next);
    };
  }
};
