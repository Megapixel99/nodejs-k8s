const router = require('express').Router();
const { PodTemplate } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${PodTemplate.apiVersion}/namespaces/:namespace/podtemplates`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.findOne(PodTemplate), general.format(PodTemplate), general.raw(PodTemplate));

router.get(['/api/v1/podtemplates', ...routes], validSchema(apiV1OpenApiV3), general.find(PodTemplate), general.format(PodTemplate), general.list(PodTemplate));

router.post(routes, validSchema(apiV1OpenApiV3), general.save(PodTemplate));

router.put(routes, validSchema(apiV1OpenApiV3), general.update(PodTemplate));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.patch(PodTemplate));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.deleteOne(PodTemplate));

router.delete(routes, validSchema(apiV1OpenApiV3), general.delete(PodTemplate));

module.exports = router;
