const router = require('express').Router();
const { Pod } = require('../objects');
const { general, openapi } = require('../middleware');
const Status = require('../objects/status.js');

const { apiV1OpenApiV3, validSchema } = openapi;

let routes = [`/api/${Pod.apiVersion}/namespaces/:namespace/pods`];
// `kubectl get <kind> -A` asks for the cluster-wide collection path; only
// the namespaced one was registered, so --all-namespaces 404'd.
const clusterRoutes = routes.map((e) => e.replace('/namespaces/:namespace', ''));

router.get(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenApiV3), general.findOne(Pod), general.format(Pod), general.sendObj(Pod));

router.get(routes.map((e) => `${e}/:name/log`), validSchema(apiV1OpenApiV3), (req, res, next) => {
  return Pod.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((pod) => {
      if (!pod) {
        return general.notFound(Pod, req, res);
      }
      // `container` is optional when the pod has exactly one, and Kubernetes
      // defaults to it. Requiring it answered 404 — "pod not found" — for a
      // plain `GET .../log`, which is both wrong and misleading.
      let containers = pod.spec?.containers || [];
      let container = req.query.container || (containers.length === 1 ? containers[0].name : undefined);
      if (!container) {
        return next(new Status({
          status: 'Failure',
          reason: 'BadRequest',
          code: 400,
          message: `a container name must be specified for pod ${req.params.name}, choose one of: [${containers.map((c) => c.name).join(' ')}]`,
        }));
      }
      // A pod whose container never started has no logs to read; docker
      // exits non-zero and that surfaced as a 500 rather than an empty body.
      return pod.logs(container)
        .then((logs) => res.status(200).send(logs))
        .catch(() => res.status(200).send(''));
    })
    .catch(next);
});

router.get([...clusterRoutes, '/api/v1/pods', ...routes], validSchema(apiV1OpenApiV3), general.find(Pod), general.find(Pod), general.format(Pod), general.list(Pod));

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
