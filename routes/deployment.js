const router = require('express').Router();
const { Deployment } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiV1OpenApiV3, validSchema } = openapi;

let routes = [`/apis/${Deployment.apiVersion}/namespaces/:namespace/deployments`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.findOne(Deployment), general.format(Deployment), general.raw(Deployment));

router.get(['/api/v1/deployments', ...routes], validSchema(apiV1OpenApiV3), general.find(Deployment), general.format(Deployment), general.list(Deployment));

router.post(routes, validSchema(apiV1OpenApiV3), general.save(Deployment));

router.put(routes, validSchema(apiV1OpenApiV3), general.update(Deployment));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.patch(Deployment));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.deleteOne(Deployment));

router.delete(routes, validSchema(apiV1OpenApiV3), general.delete(Deployment));

module.exports = router;
