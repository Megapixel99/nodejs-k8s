const router = require('express').Router();
const { Deployment } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, validSchema } = openapi;

let routes = [`/apis/${Deployment.apiVersion}/namespaces/:namespace/deployments`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(Deployment), general.format(Deployment), general.raw(Deployment));

router.get([`/apis/${Deployment.apiVersion}/deployments`, ...routes], validSchema(apiAppsV1OpenApiV3), general.find(Deployment), general.format(Deployment), general.list(Deployment));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(Deployment), general.sendObj(Deployment));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.save(Deployment), general.sendObj(Deployment));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.save(Deployment), general.sendObj(Deployment));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.save(Deployment), general.sendObj(Deployment));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.save(Deployment), general.sendObj(Deployment));

module.exports = router;
