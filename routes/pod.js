const router = require('express').Router();
const { Pod } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiV1OpenApiV3, validSchema } = openapi;

let routes = [`/api/${Pod.apiVersion}/namespaces/:namespace/pods`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.findOne(Pod), general.format(Pod), general.raw(Pod));

router.get(routes.map((e) => `${e}/:name/log`), validSchema(apiV1OpenApiV3), (req, res, next) => {
  if (req.query.container) {
    return Pod.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
      .then((pod) => {
        if (!pod) {
          return res.status(404).send(Pod.notFoundStatus(req.params.name));
        }
        return pod.logs().then((logs) => res.status(200).send(logs));
      })
  }
  return res.status(404).send(Pod.notFoundStatus(req.params.name));
});

router.get(['/api/v1/pods', ...routes], validSchema(apiV1OpenApiV3), general.find(Pod), general.find(Pod), general.format(Pod), general.list(Pod));

router.post(routes, validSchema(apiV1OpenApiV3), general.save(Pod), general.sendObj(Pod));

router.put(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.save(Pod), general.sendObj(Pod));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.save(Pod), general.sendObj(Pod));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.save(Pod), general.sendObj(Pod));

router.delete(routes, validSchema(apiV1OpenApiV3), general.save(Pod), general.sendObj(Pod));

module.exports = router;
