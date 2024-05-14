const router = require('express').Router();
const { Node } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

let route = '/api/v1/nodes';

router.get(`${route}/:name`, validSchema(apiV1OpenApiV3), general.findOne(Node));

router.get(`${route}`, validSchema(apiV1OpenApiV3), general.list(Node));

router.post(route, validSchema(apiV1OpenApiV3), general.save(Node));

router.put(route, validSchema(apiV1OpenApiV3), general.update(Node));

router.put(`${route}/:name/status`, validSchema(apiV1OpenApiV3), general.patch(Node));

router.patch(`${route}/:name`, validSchema(apiV1OpenApiV3), general.patch(Node));

router.delete(`${route}/:name`, validSchema(apiV1OpenApiV3), general.deleteOne(Node));

router.delete(route, validSchema(apiV1OpenApiV3), general.delete(Node));

module.exports = router;
