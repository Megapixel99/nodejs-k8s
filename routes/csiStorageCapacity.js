const router = require('express').Router();
const { CSIStorageCapacity } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${CSIStorageCapacity.apiVersion}/:namespace/csistoragecapacities`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(CSIStorageCapacity), general.format(CSIStorageCapacity), general.raw(CSIStorageCapacity));

router.get(['/api/v1/csistoragecapacitys', ...routes], validSchema(apiV1OpenApiV3), general.find(CSIStorageCapacity), general.format(CSIStorageCapacity), general.list(CSIStorageCapacity));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(CSIStorageCapacity));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(CSIStorageCapacity));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(CSIStorageCapacity));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(CSIStorageCapacity));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(CSIStorageCapacity));

module.exports = router;
