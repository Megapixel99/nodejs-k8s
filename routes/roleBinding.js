const router = require('express').Router();
const { RoleBinding } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiRbacAuthorizatonK8sIoV1OpenApiV3, validSchema } = openapi;

let routes = [`/apis/${RoleBinding.apiVersion}/namespaces/:namespace/rolebindings`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.findOne(RoleBinding), general.format(RoleBinding), general.raw(RoleBinding));

router.get([`/apis/${RoleBinding.apiVersion}/rolebindings`, ...routes], validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.find(RoleBinding), general.format(RoleBinding), general.list(RoleBinding));

router.post(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.save(RoleBinding));

router.put(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.update(RoleBinding));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.patch(RoleBinding));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.deleteOne(RoleBinding));

router.delete(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.delete(RoleBinding));

module.exports = router;
