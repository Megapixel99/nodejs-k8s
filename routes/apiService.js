const router = require('express').Router();
const { APIService } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/apis/${APIService.apiVersion}/apiservices`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(APIService), general.format(APIService), general.raw(APIService));

router.get([`/apis/${APIService.apiVersion}/apiservices`, ...routes], validSchema(apiV1OpenApiV3), general.find(APIService), general.format(APIService), general.list(APIService));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(APIService), general.sendObj(APIService));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.save(APIService), general.sendObj(APIService));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.save(APIService), general.sendObj(APIService));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.save(APIService), general.sendObj(APIService));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.save(APIService), general.sendObj(APIService));

module.exports = router;
