const router = require('express').Router();
const { Endpoints } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/apis/${Endpoints.apiVersion}/namespaces/:namespace/endpoints`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.findOne(Endpoints), general.format(Endpoints), general.raw(Endpoints));

router.get(['/api/v1/endpoints', ...routes], validSchema(apiV1OpenApiV3), general.find(Endpoints), general.format(Endpoints), general.list(Endpoints));

router.post(routes, validSchema(apiV1OpenApiV3), general.save(Endpoints), general.sendObj(Endpoints));

router.put(routes, validSchema(apiV1OpenApiV3), general.save(Endpoints), general.sendObj(Endpoints));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.save(Endpoints), general.sendObj(Endpoints));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.save(Endpoints), general.sendObj(Endpoints));

router.delete(routes, validSchema(apiV1OpenApiV3), general.save(Endpoints), general.sendObj(Endpoints));

module.exports = router;
