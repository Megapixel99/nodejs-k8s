const router = require('express').Router();
const { ClusterRoleBinding } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiRbacAuthorizatonK8sIoV1OpenApiV3, validSchema } = openapi;

let routes = [`/apis/${ClusterRoleBinding.apiVersion}/clusterrolebindings`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.findOne(ClusterRoleBinding), general.format(ClusterRoleBinding), general.sendObj(ClusterRoleBinding));

router.get([`/apis/${ClusterRoleBinding.apiVersion}/clusterrolebindings`, ...routes], validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.find(ClusterRoleBinding), general.format(ClusterRoleBinding), general.list(ClusterRoleBinding));

router.post(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.save(ClusterRoleBinding), general.sendObj(ClusterRoleBinding));

router.put([...routes.map((e) => `${e}/:name`), ...routes], validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.update(ClusterRoleBinding), general.sendObj(ClusterRoleBinding));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.patch(ClusterRoleBinding), general.sendObj(ClusterRoleBinding));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.deleteOne(ClusterRoleBinding), general.sendObj(ClusterRoleBinding));

router.delete(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.delete(ClusterRoleBinding), general.sendObj(ClusterRoleBinding));

module.exports = router;
