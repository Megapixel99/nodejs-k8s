const router = require('express').Router();
const { MutatingWebhookConfiguration } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${MutatingWebhookConfiguration.apiVersion}/:namespace/mutatingwebhookconfigurations`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(MutatingWebhookConfiguration));

router.get(['/api/v1/mutatingwebhookconfigurations', ...routes], validSchema(apiV1OpenApiV3), general.list(MutatingWebhookConfiguration));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(MutatingWebhookConfiguration));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(MutatingWebhookConfiguration));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(MutatingWebhookConfiguration));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(MutatingWebhookConfiguration));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(MutatingWebhookConfiguration));

module.exports = router;