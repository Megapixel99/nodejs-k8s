const router = require('express').Router();
const { ControllerRevision } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${ControllerRevision.apiVersion}/:namespace/controllerrevisions`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(ControllerRevision), general.format(ControllerRevision), general.raw(ControllerRevision));

router.get(['/api/v1/controllerrevisions', ...routes], validSchema(apiV1OpenApiV3), general.find(ControllerRevision), general.format(ControllerRevision), general.list(ControllerRevision));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(ControllerRevision));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(ControllerRevision));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(ControllerRevision));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(ControllerRevision));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(ControllerRevision));

module.exports = router;
