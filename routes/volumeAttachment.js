const router = require('express').Router();
const { VolumeAttachment } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${VolumeAttachment.apiVersion}/:namespace/volumeattachments`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(VolumeAttachment), general.format(VolumeAttachment), general.raw(VolumeAttachment));

router.get(['/api/v1/volumeattachments', ...routes], validSchema(apiV1OpenApiV3), general.find(VolumeAttachment), general.format(VolumeAttachment), general.list(VolumeAttachment));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(VolumeAttachment));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(VolumeAttachment));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(VolumeAttachment));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(VolumeAttachment));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(VolumeAttachment));

module.exports = router;
