const router = require('express').Router();
const { Lease } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/apis/${Lease.apiVersion}/leases`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(Lease), general.format(Lease), general.raw(Lease));

router.get(['/api/v1/leases', ...routes], validSchema(apiV1OpenApiV3), general.find(Lease), general.format(Lease), general.list(Lease));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(Lease), general.sendObj(Lease));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(Lease), general.sendObj(Lease));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(Lease), general.sendObj(Lease));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(Lease), general.sendObj(Lease));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(Lease), general.sendObj(Lease));

module.exports = router;
