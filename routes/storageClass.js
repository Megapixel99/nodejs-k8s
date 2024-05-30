const router = require('express').Router();
const { StorageClass } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/apis/${StorageClass.apiVersion}/storageclasses`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(StorageClass), general.format(StorageClass), general.raw(StorageClass));

router.get(['/api/v1/storageclasses', ...routes], validSchema(apiV1OpenApiV3), general.find(StorageClass), general.format(StorageClass), general.list(StorageClass));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(StorageClass));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(StorageClass));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(StorageClass));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(StorageClass));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(StorageClass));

module.exports = router;
