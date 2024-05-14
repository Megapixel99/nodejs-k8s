const router = require('express').Router();
const { ReplicaSet } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const route = `/apis/${ReplicaSet.apiVersion}/namespaces/:namespace/replicasets`;

router.get(`${route}/:name`, validSchema(apiV1OpenApiV3), general.findOne(ReplicaSet));

router.get(`${route}`, validSchema(apiV1OpenApiV3), general.list(ReplicaSet));

router.post(route, validSchema(apiV1OpenApiV3), general.save(ReplicaSet));

router.put(route, validSchema(apiV1OpenApiV3), general.update(ReplicaSet));

router.put(`${route}/:name/status`, validSchema(apiV1OpenApiV3), general.patch(ReplicaSet));

router.patch(`${route}/:name`, validSchema(apiV1OpenApiV3), general.patch(ReplicaSet));

router.delete(`${route}/:name`, validSchema(apiV1OpenApiV3), general.deleteOne(ReplicaSet));

router.delete(route, validSchema(apiV1OpenApiV3), general.delete(ReplicaSet));

module.exports = router;
