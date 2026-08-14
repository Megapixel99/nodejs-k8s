const router = require('express').Router();
const { ValidatingWebhookConfiguration } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/apis/admissionregistration.k8s.io/v1/validatingwebhookconfigurations`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(ValidatingWebhookConfiguration), general.format(ValidatingWebhookConfiguration), general.sendObj(ValidatingWebhookConfiguration));

router.get(['/api/v1/validatingwebhookconfigurations', ...routes], validSchema(apiV1OpenApiV3), general.find(ValidatingWebhookConfiguration), general.format(ValidatingWebhookConfiguration), general.list(ValidatingWebhookConfiguration));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(ValidatingWebhookConfiguration), general.sendObj(ValidatingWebhookConfiguration));

router.put([...routes.map((e) => `${e}/:name`), ...routes], validSchema(apiAppsV1OpenApiV3), general.update(ValidatingWebhookConfiguration), general.sendObj(ValidatingWebhookConfiguration));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(ValidatingWebhookConfiguration), general.sendObj(ValidatingWebhookConfiguration));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(ValidatingWebhookConfiguration), general.sendObj(ValidatingWebhookConfiguration));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(ValidatingWebhookConfiguration), general.sendObj(ValidatingWebhookConfiguration));

module.exports = router;
