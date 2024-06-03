const router = require('express').Router();
const { ReplicaSet } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const route = `/apis/${ReplicaSet.apiVersion}/namespaces/:namespace/replicasets`;

router.get(`${route}/:name`, validSchema(apiV1OpenApiV3), general.findOne(ReplicaSet), general.format(ReplicaSet), general.raw(ReplicaSet));

router.get([`/apis/${ReplicaSet.apiVersion}/replicasets`, route], validSchema(apiV1OpenApiV3), general.find(ReplicaSet), general.format(ReplicaSet), general.list(ReplicaSet));

router.post(route, validSchema(apiV1OpenApiV3), general.save(ReplicaSet), general.sendObj(ReplicaSet));

router.put(route, validSchema(apiV1OpenApiV3), general.save(ReplicaSet), general.sendObj(ReplicaSet));

router.put(`${route}/:name/status`, validSchema(apiV1OpenApiV3), general.save(ReplicaSet), general.sendObj(ReplicaSet));

router.patch(`${route}/:name`, validSchema(apiV1OpenApiV3), general.save(ReplicaSet), general.sendObj(ReplicaSet));

router.delete(`${route}/:name`, validSchema(apiV1OpenApiV3), general.save(ReplicaSet), general.sendObj(ReplicaSet));

router.delete(route, validSchema(apiV1OpenApiV3), general.save(ReplicaSet), general.sendObj(ReplicaSet));

module.exports = router;
