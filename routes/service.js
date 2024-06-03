const router = require('express').Router();
const { Service } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiV1OpenApiV3, validSchema } = openapi;

let routes = [`/api/${Service.apiVersion}/namespaces/:namespace/services`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.findOne(Service), general.format(Service), general.raw(Service));

router.get(['/api/v1/services', ...routes], validSchema(apiV1OpenApiV3), general.find(Service), general.format(Service), general.list(Service));

router.post(routes, validSchema(apiV1OpenApiV3), general.save(Service), general.sendObj(Service));

router.put(routes, validSchema(apiV1OpenApiV3), general.save(Service), general.sendObj(Service));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.save(Service), general.sendObj(Service));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.save(Service), general.sendObj(Service));

router.delete(routes, validSchema(apiV1OpenApiV3), general.save(Service), general.sendObj(Service));

module.exports = router;
