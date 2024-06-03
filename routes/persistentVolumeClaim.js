const router = require('express').Router();
const { PersistentVolumeClaim } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${PersistentVolumeClaim.apiVersion}/:namespace/persistentvolumeclaims`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(PersistentVolumeClaim), general.format(PersistentVolumeClaim), general.raw(PersistentVolumeClaim));

router.get(['/api/v1/persistentvolumeclaims', ...routes], validSchema(apiV1OpenApiV3), general.find(PersistentVolumeClaim), general.format(PersistentVolumeClaim), general.list(PersistentVolumeClaim));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(PersistentVolumeClaim), general.sendObj(PersistentVolumeClaim));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(PersistentVolumeClaim), general.sendObj(PersistentVolumeClaim));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(PersistentVolumeClaim), general.sendObj(PersistentVolumeClaim));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(PersistentVolumeClaim), general.sendObj(PersistentVolumeClaim));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(PersistentVolumeClaim), general.sendObj(PersistentVolumeClaim));

module.exports = router;
