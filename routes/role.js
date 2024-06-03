const router = require('express').Router();
const { Role } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiRbacAuthorizatonK8sIoV1OpenApiV3, validSchema } = openapi;

let routes = [`/apis/${Role.apiVersion}/namespaces/:namespace/roles`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.findOne(Role), general.format(Role), general.raw(Role));

router.get([`/apis/${Role.apiVersion}/roles`, ...routes], validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.find(Role), general.format(Role), general.list(Role));

router.post(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.save(Role), general.sendObj(Role));

router.put(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.save(Role), general.sendObj(Role));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.save(Role), general.sendObj(Role));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.save(Role), general.sendObj(Role));

router.delete(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.save(Role), general.sendObj(Role));

module.exports = router;
