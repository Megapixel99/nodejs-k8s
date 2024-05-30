const router = require('express').Router();
const { Node, Pod } = require('../objects');
const { general, protoBuf, openapi } = require('../middleware');

const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;

let route = `/api/${Node.apiVersion}/nodes`;

router.get(`${route}/:name`, validSchema(apiV1OpenApiV3), general.findOne(Node), general.format(Node), general.raw(Node));

router.get(`${route}/:name/proxy/pods`, validSchema(apiV1OpenApiV3), (req, res, next) => {
  Pod.listByQuery({ 'status.hostIP': req.params.name.split(':')[0] })
    .then((pods) => res.send(pods))
    .catch(next);
});

router.get(`${route}/:name/proxy/metrics`, validSchema(apiV1OpenApiV3), (req, res, next) => {
  res.send('');
});

router.get(`${route}`, validSchema(apiV1OpenApiV3), general.find(Node), general.format(Node), general.format(Node), general.format(Node), general.list(Node), general.format(Node));

router.post(route, validSchema(apiV1OpenApiV3), general.save(Node));

router.put(route, validSchema(apiV1OpenApiV3), general.update(Node));

router.put(`${route}/:name/status`, validSchema(apiV1OpenApiV3), general.patch(Node));

router.patch(`${route}/:name`, validSchema(apiV1OpenApiV3), general.patch(Node));

router.delete(`${route}/:name`, validSchema(apiV1OpenApiV3), general.deleteOne(Node));

router.delete(route, validSchema(apiV1OpenApiV3), general.delete(Node));

module.exports = router;
