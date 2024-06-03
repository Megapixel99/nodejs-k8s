const router = require('express').Router();
const { Event } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiV1OpenApiV3, validSchema } = openapi;

let routes = [`/api/v1/namespaces/:namespace/events`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.findOne(Event), general.format(Event), general.raw(Event));

router.get(['/api/v1/events', ...routes], validSchema(apiV1OpenApiV3), general.find(Event), general.format(Event), general.list(Event));

router.post(routes, validSchema(apiV1OpenApiV3), general.save(Event), general.sendObj(Event));

router.put(routes, validSchema(apiV1OpenApiV3), general.save(Event), general.sendObj(Event));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.save(Event), general.sendObj(Event));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.save(Event), general.sendObj(Event));

router.delete(routes, validSchema(apiV1OpenApiV3), general.save(Event), general.sendObj(Event));

module.exports = router;
