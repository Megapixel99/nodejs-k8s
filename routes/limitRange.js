const router = require('express').Router();
const { LimitRange } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${LimitRange.apiVersion}/:namespace/limitranges`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.findOne(LimitRange), general.format(LimitRange), general.raw(LimitRange));

router.get([`/api/${LimitRange.apiVersion}/limitranges`, ...routes], validSchema(apiV1OpenApiV3), general.find(LimitRange), general.format(LimitRange), general.list(LimitRange));

router.post(routes, validSchema(apiV1OpenApiV3), general.save(LimitRange));

router.put(routes, validSchema(apiV1OpenApiV3), general.update(LimitRange));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.patch(LimitRange));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.deleteOne(LimitRange));

router.delete(routes, validSchema(apiV1OpenApiV3), general.delete(LimitRange));

module.exports = router;
