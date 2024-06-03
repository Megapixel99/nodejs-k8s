const router = require('express').Router();
const { ClusterRole } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiRbacAuthorizatonK8sIoV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

let routes = [`/apis/${ClusterRole.apiVersion}/clusterroles`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.findOne(ClusterRole), general.format(ClusterRole), general.raw(ClusterRole));

router.get(['/api/v1/clusterroles', ...routes], validSchema(apiV1OpenApiV3), general.find(ClusterRole), general.format(ClusterRole), general.list(ClusterRole));

router.post(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.save(ClusterRole), general.sendObj(ClusterRole));

router.put(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.update(ClusterRole), general.sendObj(ClusterRole));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.patch(ClusterRole), general.sendObj(ClusterRole));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.deleteOne(ClusterRole), general.sendObj(ClusterRole));

router.delete(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.delete(ClusterRole), general.sendObj(ClusterRole));

module.exports = router;
