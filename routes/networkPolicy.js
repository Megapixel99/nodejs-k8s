const router = require('express').Router();
const { NetworkPolicy } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiRbacAuthorizatonK8sIoV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

let routes = [`/apis/${NetworkPolicy.apiVersion}/networkpolicies`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.findOne(NetworkPolicy), general.format(NetworkPolicy), general.raw(NetworkPolicy));

router.get(['/api/v1/networkpolicies', ...routes], validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.find(NetworkPolicy), general.format(NetworkPolicy), general.list(NetworkPolicy));

router.post(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.save(NetworkPolicy), general.sendObj(NetworkPolicy));

router.put(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.save(NetworkPolicy), general.sendObj(NetworkPolicy));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.save(NetworkPolicy), general.sendObj(NetworkPolicy));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.save(NetworkPolicy), general.sendObj(NetworkPolicy));

router.delete(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.save(NetworkPolicy), general.sendObj(NetworkPolicy));

module.exports = router;
