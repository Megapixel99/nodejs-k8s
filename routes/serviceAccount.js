const router = require('express').Router();
const { ServiceAccount } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${ServiceAccount.apiVersion}/namespaces/:namespace/serviceaccounts`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.findOne(ServiceAccount), general.format(ServiceAccount), general.raw(ServiceAccount));

router.get([`/api/${ServiceAccount.apiVersion}/serviceaccounts`, ...routes], validSchema(apiV1OpenApiV3), general.find(ServiceAccount), general.format(ServiceAccount), general.list(ServiceAccount));

router.post(routes, validSchema(apiV1OpenApiV3), general.save(ServiceAccount), general.sendObj(ServiceAccount));

router.put(routes, validSchema(apiV1OpenApiV3), general.save(ServiceAccount), general.sendObj(ServiceAccount));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.save(ServiceAccount), general.sendObj(ServiceAccount));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.save(ServiceAccount), general.sendObj(ServiceAccount));

router.delete(routes, validSchema(apiV1OpenApiV3), general.save(ServiceAccount), general.sendObj(ServiceAccount));

module.exports = router;
