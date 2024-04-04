const router = require('express').Router();
const { Ingress, Service, DNS } = require('../database/models.js');
const { apiNetworkingK8sIoV1OpenApiV3, validSchema } = require('./openapi.js');
const { duration, createPod } = require('../functions.js');

const routes = ['/apis/networking.k8s.io/v1/namespaces/:namespace/ingresses', '/api/v1/namespaces/:namespace/ingresses'];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiNetworkingK8sIoV1OpenApiV3), (req, res, next) => {
  Ingress.find({ 'metadata.name': req.query.name }).then((ingress) => {
    res.send(ingress);
  }).catch(next);
});

router.get(routes.map((e) => `${e}/:name/status`), validSchema(apiNetworkingK8sIoV1OpenApiV3), (req, res, next) => {
  Ingress.find({ 'metadata.name': req.query.name }).then((ingress) => {
    res.send(ingress.status);
  }).catch(next);
});

router.post(routes, validSchema(apiNetworkingK8sIoV1OpenApiV3), (req, res, next) => {
  if (!req.body?.metadata?.creationTimestamp) {
    req.body.metadata.creationTimestamp = new Date();
  }
  if (!req.body?.metadata?.namespace) {
    req.body.metadata.namespace = (req.params.namespace || "default");
  }
  new Ingress(req.body).save()
    .then(() => Promise.all(
      req.body.spec.rules.map((rule) => {
        return rule.http.paths.map((path) => {
          return Service.findOne({ 'metadata.name': path.backend.serviceName })
            .then((service) => {
              let arr = []
              if (service?.externalIPs?.length > 0) {
                arr.push(
                  ...service.externalIPs.map((e) => {
                    new DNS({
                      name: rule.host,
                      type: 'A',
                      class: 'IN',
                      ttl: 300,
                      address: e,
                    }).save()
                  })
                );
              }
            })
        })
        .flat()
        .filter((e) => e);
      }))
      .flat()
    )
  .then(() => res.status(201).send(req.body))
});

module.exports = router;
