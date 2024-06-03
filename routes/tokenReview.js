const router = require('express').Router();
const { TokenReview } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

const routes = [`/api/${TokenReview.apiVersion}/:namespace/tokenreviews`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.findOne(TokenReview), general.format(TokenReview), general.raw(TokenReview));

router.get(['/api/v1/tokenreviews', ...routes], validSchema(apiV1OpenApiV3), general.find(TokenReview), general.format(TokenReview), general.list(TokenReview));

router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(TokenReview), general.sendObj(TokenReview));

router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(TokenReview), general.sendObj(TokenReview));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.patch(TokenReview), general.sendObj(TokenReview));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(TokenReview), general.sendObj(TokenReview));

router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(TokenReview), general.sendObj(TokenReview));

module.exports = router;
