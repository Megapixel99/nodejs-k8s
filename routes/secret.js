const router = require('express').Router();
const { Secret } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiV1OpenApiV3, validSchema } = openapi;

let routes = [`/api/${Secret.apiVersion}/namespaces/:namespace/secrets`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.findOne(Secret), general.format(Secret), general.raw(Secret));

router.get([`/api/${Secret.apiVersion}/secrets`, ...routes], validSchema(apiV1OpenApiV3), general.find(Secret), general.format(Secret), general.list(Secret));

router.post(routes, validSchema(apiV1OpenApiV3), general.save(Secret), general.sendObj(Secret));

router.put(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.save(Secret), general.sendObj(Secret));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.save(Secret), general.sendObj(Secret));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.save(Secret), general.sendObj(Secret));

router.delete(routes, validSchema(apiV1OpenApiV3), general.save(Secret), general.sendObj(Secret));

module.exports = router;
