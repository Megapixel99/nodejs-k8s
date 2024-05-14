const router = require('express').Router();
const { Lease } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/apis/${Lease.apiVersion}/leases`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(Lease));

router.get(['/api/v1/leases', ...routes], validSchema(apiV1OpenApiV3), general.list(Lease));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(Lease));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(Lease));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(Lease));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(Lease));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(Lease));

module.exports = router;
