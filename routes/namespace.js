const router = require('express').Router();
const { Namespace } = require('../objects');
const { general, openapi, protoBuf } = require('../middleware');
const { toProtoBuf, fromProtoBuf } = protoBuf;

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

let routes = [`/api/${Namespace.apiVersion}/namespaces`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(Namespace), general.format(Namespace), general.raw(Namespace));

router.get(routes, validSchema(apiV1OpenApiV3), general.find(Namespace), general.format(Namespace), general.list(Namespace));

router.post(routes, validSchema(apiV1OpenApiV3), fromProtoBuf, general.save(Namespace));

router.put(routes, validSchema(apiV1OpenApiV3), fromProtoBuf, general.update(Namespace));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), fromProtoBuf, general.patch(Namespace));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), fromProtoBuf, general.deleteOne(Namespace));

router.delete(routes, validSchema(apiV1OpenApiV3), fromProtoBuf, general.delete(Namespace));

module.exports = router;
