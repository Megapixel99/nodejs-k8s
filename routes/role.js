const router = require('express').Router();
const { Role } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiRbacAuthorizatonK8sIoV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

let routes = ['/apis/rbac.authorization.k8s.io/v1/namespaces/:namespace/roles'];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.findOne(Role));

router.get(['/api/v1/roles', ...routes], validSchema(apiV1OpenApiV3), general.list(Role));

router.post(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.save(Role));

router.put(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.update(Role));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.patch(Role));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.deleteOne(Role));

router.delete(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.delete(Role));

module.exports = router;
