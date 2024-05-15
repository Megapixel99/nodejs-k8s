const router = require('express').Router();
const { ReplicationController } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const route = `/api/${ReplicationController.apiVersion}/namespaces/:namespace/replicationcontrollers`;

router.get(`${route}/:name`, validSchema(apiV1OpenApiV3), general.findOne(ReplicationController));

router.get(`${route}`, validSchema(apiV1OpenApiV3), general.list(ReplicationController));

router.post(route, validSchema(apiV1OpenApiV3), general.save(ReplicationController));

router.put(route, validSchema(apiV1OpenApiV3), general.update(ReplicationController));

router.put(`${route}/:name/status`, validSchema(apiV1OpenApiV3), general.patch(ReplicationController));

router.patch(`${route}/:name`, validSchema(apiV1OpenApiV3), general.patch(ReplicationController));

router.delete(`${route}/:name`, validSchema(apiV1OpenApiV3), general.deleteOne(ReplicationController));

router.delete(route, validSchema(apiV1OpenApiV3), general.delete(ReplicationController));

module.exports = router;
