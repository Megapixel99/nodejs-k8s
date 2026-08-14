const router = require('express').Router();
const { ComponentStatus } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

// ComponentStatus is a core resource, so /api/v1 is the canonical path; it
// was only wired for list.
const routes = [`/api/v1/componentstatuses`, `/apis/${ComponentStatus.apiVersion}/componentstatuses`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(ComponentStatus), general.format(ComponentStatus), general.sendObj(ComponentStatus));

router.get(['/api/v1/componentstatuses', ...routes], validSchema(apiV1OpenApiV3), general.find(ComponentStatus), general.format(ComponentStatus), general.list(ComponentStatus));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(ComponentStatus), general.sendObj(ComponentStatus));

router.put([...routes.map((e) => `${e}/:name`), ...routes], validSchema(apiAppsV1OpenApiV3), general.update(ComponentStatus), general.sendObj(ComponentStatus));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(ComponentStatus), general.sendObj(ComponentStatus));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(ComponentStatus), general.sendObj(ComponentStatus));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(ComponentStatus), general.sendObj(ComponentStatus));

module.exports = router;
