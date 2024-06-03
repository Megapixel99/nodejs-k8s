const router = require('express').Router();
const { LimitRange } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${LimitRange.apiVersion}/:namespace/limitranges`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.findOne(LimitRange), general.format(LimitRange), general.raw(LimitRange));

router.get([`/api/${LimitRange.apiVersion}/limitranges`, ...routes], validSchema(apiV1OpenApiV3), general.find(LimitRange), general.format(LimitRange), general.list(LimitRange));

router.post(routes, validSchema(apiV1OpenApiV3), general.save(LimitRange), general.sendObj(LimitRange));

router.put(routes, validSchema(apiV1OpenApiV3), general.update(LimitRange), general.sendObj(LimitRange));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.patch(LimitRange), general.sendObj(LimitRange));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.deleteOne(LimitRange), general.sendObj(LimitRange));

router.delete(routes, validSchema(apiV1OpenApiV3), general.delete(LimitRange), general.sendObj(LimitRange));

module.exports = router;
