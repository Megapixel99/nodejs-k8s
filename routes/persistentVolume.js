const router = require('express').Router();
const { PersistentVolume } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${PersistentVolume.apiVersion}/:namespace/persistentvolumes`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(PersistentVolume), general.format(PersistentVolume), general.raw(PersistentVolume));

router.get(['/api/v1/persistentvolumes', ...routes], validSchema(apiV1OpenApiV3), general.find(PersistentVolume), general.format(PersistentVolume), general.list(PersistentVolume));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(PersistentVolume), general.sendObj(PersistentVolume));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(PersistentVolume), general.sendObj(PersistentVolume));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(PersistentVolume), general.sendObj(PersistentVolume));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(PersistentVolume), general.sendObj(PersistentVolume));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(PersistentVolume), general.sendObj(PersistentVolume));

module.exports = router;
