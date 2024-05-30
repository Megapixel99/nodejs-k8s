const router = require('express').Router();
const { ClusterRoleBinding } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiRbacAuthorizatonK8sIoV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

let routes = [`/apis/${ClusterRoleBinding.apiVersion}/clusterrolebindings`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.findOne(ClusterRoleBinding), general.format(ClusterRoleBinding), general.raw(ClusterRoleBinding));

router.get(['/api/v1/clusterrolebindings', ...routes], validSchema(apiV1OpenApiV3), general.find(ClusterRoleBinding), general.format(ClusterRoleBinding), general.list(ClusterRoleBinding));

router.post(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.save(ClusterRoleBinding));

router.put(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.update(ClusterRoleBinding));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.patch(ClusterRoleBinding));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.deleteOne(ClusterRoleBinding));

router.delete(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.delete(ClusterRoleBinding));

module.exports = router;
