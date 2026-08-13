const router = require('express').Router();
const { Pod } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiV1OpenApiV3, validSchema } = openapi;

let routes = [`/api/${Pod.apiVersion}/namespaces/:namespace/pods`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.findOne(Pod), general.format(Pod), general.sendObj(Pod));

router.get(routes.map((e) => `${e}/:name/log`), validSchema(apiV1OpenApiV3), (req, res, next) => {
  if (req.query.container) {
    return Pod.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
      .then((pod) => {
        if (!pod) {
          return general.notFound(Pod, req, res);
        }
        return pod.logs(req.query.container).then((logs) => res.status(200).send(logs));
      })
  }
  return general.notFound(Pod, req, res);
});

router.get(['/api/v1/pods', ...routes], validSchema(apiV1OpenApiV3), general.find(Pod), general.find(Pod), general.format(Pod), general.list(Pod));

router.post(routes, validSchema(apiV1OpenApiV3), general.save(Pod), general.sendObj(Pod));

router.put(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.update(Pod), general.sendObj(Pod));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.patch(Pod), general.sendObj(Pod));

// Status subresource — same handlers, just scoped by URL suffix.
router.get(routes.map((e) => `${e}/:name/status`), validSchema(apiV1OpenApiV3), general.findOne(Pod), general.format(Pod), general.sendObj(Pod));
router.put(routes.map((e) => `${e}/:name/status`), validSchema(apiV1OpenApiV3), general.update(Pod), general.sendObj(Pod));
router.patch(routes.map((e) => `${e}/:name/status`), validSchema(apiV1OpenApiV3), general.patch(Pod), general.sendObj(Pod));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.deleteOne(Pod), general.sendObj(Pod));

router.delete(routes, validSchema(apiV1OpenApiV3), general.delete(Pod), general.sendObj(Pod));

module.exports = router;
