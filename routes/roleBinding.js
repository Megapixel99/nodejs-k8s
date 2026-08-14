const router = require('express').Router();
const { RoleBinding } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiRbacAuthorizatonK8sIoV1OpenApiV3, validSchema } = openapi;

let routes = [`/apis/${RoleBinding.apiVersion}/namespaces/:namespace/rolebindings`];
// `kubectl get <kind> -A` asks for the cluster-wide collection path; only
// the namespaced one was registered, so --all-namespaces 404'd.
const clusterRoutes = routes.map((e) => e.replace('/namespaces/:namespace', ''));

router.get(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.findOne(RoleBinding), general.format(RoleBinding), general.sendObj(RoleBinding));

router.get([...clusterRoutes, `/apis/${RoleBinding.apiVersion}/rolebindings`, ...routes], validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.find(RoleBinding), general.format(RoleBinding), general.list(RoleBinding));

router.post(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.save(RoleBinding), general.sendObj(RoleBinding));

router.put([...routes.map((e) => `${e}/:name`), ...routes], validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.update(RoleBinding), general.sendObj(RoleBinding));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.patch(RoleBinding), general.sendObj(RoleBinding));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.deleteOne(RoleBinding), general.sendObj(RoleBinding));

router.delete(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.delete(RoleBinding), general.sendObj(RoleBinding));

module.exports = router;
