const router = require('express').Router();
const { Binding } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiV1OpenApiV3, validSchema } = openapi;

router.post(`/api/${Binding.apiVersion}/namespaces/:namespace/bindings`, validSchema(apiV1OpenApiV3), general.save(Binding));

router.post(`/api/${Binding.apiVersion}/namespaces/:namespace/pods/:name/binding`, validSchema(apiV1OpenApiV3), general.save(Binding));

module.exports = router;
