const router = require('express').Router();
const { NetworkPolicy } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiRbacAuthorizatonK8sIoV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

// The canonical path is group-qualified; the model's apiVersion is bare
// 'v1', so serve both — discovery advertises the canonical one.
// Second entry is the legacy un-grouped path this server used to serve.
let routes = [`/apis/${NetworkPolicy.apiVersion}/networkpolicies`, `/apis/v1/networkpolicies`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.findOne(NetworkPolicy), general.format(NetworkPolicy), general.sendObj(NetworkPolicy));

router.get(['/api/v1/networkpolicies', ...routes], validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.find(NetworkPolicy), general.format(NetworkPolicy), general.list(NetworkPolicy));

router.post(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.save(NetworkPolicy), general.sendObj(NetworkPolicy));

router.put(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.update(NetworkPolicy), general.sendObj(NetworkPolicy));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.patch(NetworkPolicy), general.sendObj(NetworkPolicy));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.deleteOne(NetworkPolicy), general.sendObj(NetworkPolicy));

router.delete(routes, validSchema(apiRbacAuthorizatonK8sIoV1OpenApiV3), general.delete(NetworkPolicy), general.sendObj(NetworkPolicy));

module.exports = router;
