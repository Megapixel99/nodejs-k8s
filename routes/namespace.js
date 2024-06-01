const router = require('express').Router();
const { Namespace } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

let routes = [`/api/${Namespace.apiVersion}/namespaces`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(Namespace), general.format(Namespace), general.raw(Namespace));

router.get(routes, validSchema(apiV1OpenApiV3), general.find(Namespace), general.format(Namespace), general.list(Namespace));

router.post(routes, validSchema(apiV1OpenApiV3), general.save(Namespace));

router.put(routes, validSchema(apiV1OpenApiV3), general.update(Namespace));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.patch(Namespace));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.deleteOne(Namespace));

router.delete(routes, validSchema(apiV1OpenApiV3), general.delete(Namespace));

module.exports = router;
