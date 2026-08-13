const router = require('express').Router();
const { Namespace } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

let routes = [`/api/${Namespace.apiVersion}/namespaces`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(Namespace), general.format(Namespace), general.sendObj(Namespace));

router.get(routes, validSchema(apiV1OpenApiV3), general.find(Namespace), general.format(Namespace), general.list(Namespace));

router.post(routes, validSchema(apiV1OpenApiV3), general.save(Namespace), general.sendObj(Namespace));

router.put([...routes.map((e) => `${e}/:name`), ...routes], validSchema(apiV1OpenApiV3), general.update(Namespace), general.sendObj(Namespace));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.patch(Namespace), general.sendObj(Namespace));

// Status subresource endpoints.
router.get(routes.map((e) => `${e}/:name/status`), general.findOne(Namespace), general.format(Namespace), general.sendObj(Namespace));
router.put(routes.map((e) => `${e}/:name/status`), general.update(Namespace), general.sendObj(Namespace));
router.patch(routes.map((e) => `${e}/:name/status`), general.patch(Namespace), general.sendObj(Namespace));
// Finalize subresource (POST) — used for namespace deletion flow.
router.put(routes.map((e) => `${e}/:name/finalize`), general.update(Namespace), general.sendObj(Namespace));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.deleteOne(Namespace), general.sendObj(Namespace));

router.delete(routes, validSchema(apiV1OpenApiV3), general.delete(Namespace), general.sendObj(Namespace));

module.exports = router;
