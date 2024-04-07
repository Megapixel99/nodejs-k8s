const router = require('express').Router();
const { Service } = require('../objects');
const { apiV1OpenapiV3, validSchema } = require('./openapi.js');

let routes = ['/apis/apps/v1/namespaces/:namespace/services', '/api/v1/namespaces/:namespace/services'];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenapiV3), (req, res, next) => {
  Service.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
  .then((service) => {
    if (service) {
      return res.status(200).send(service);
    }
    return res.status(404).send(Service.notFoundStatus(req.params.name));
  })
  .catch(next);
});

router.get(routes, validSchema(apiV1OpenapiV3), (req, res, next) => {
  if (req.headers?.accept?.split(';').find((e) => e === 'as=Table')) {
    return Service.table({
      ...req.query,
      namespace: req.params.namespace,
    })
      .then((serviceList) => res.status(200).send(serviceList))
      .catch(next);
  }
  Service.list({
    ...req.query,
    namespace: req.params.namespace,
  })
    .then((serviceList) => res.status(200).send(serviceList))
    .catch(next);
})

router.get('/api/v1/services', validSchema(apiV1OpenapiV3), (req, res, next) => {
  if (req.headers?.accept?.split(';').find((e) => e === 'as=Table')) {
    return Service.table(req.query)
      .then((serviceList) => res.status(200).send(serviceList))
      .catch(next);
  }
  Service.list(req.query)
  .then((serviceList) => res.status(200).send(serviceList))
  .catch(next);
});

router.post(routes, validSchema(apiV1OpenapiV3), (req, res, next) => {
  if (!req.body?.metadata?.creationTimestamp) {
    req.body.metadata.creationTimestamp = new Date();
  }
  if (!req.body?.metadata?.namespace) {
    req.body.metadata.namespace = (req.params.namespace || "default");
  }
  Service.create(req.body)
  .then((service) => res.status(201).send(service))
  .catch(next);
});

router.put(routes, validSchema(apiV1OpenapiV3), (req, res, next) => {
  if (Object.keys(req.body).length > 0) {
    Service.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((service) => service ? service.update(req.body) : Promise.resolve())
    .then((service) => {
      if (service) {
        return res.status(201).send(service);
      }
      return res.status(404).send(Service.notFoundStatus(req.params.name));
    })
    .catch(next);
  } else {
    Service.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((service) => {
      if (service) {
        return res.status(200).send(service);
      }
      return res.status(404).send(Service.notFoundStatus(req.params.name));
    })
    .catch(next);
  }
});

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenapiV3), (req, res, next) => {
  if (Object.keys(req.body).length > 0) {
    Service.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((service) => service ? service.update(req.body) : Promise.resolve())
    .then((service) => {
      if (service) {
        return res.status(201).send(service);
      }
      return res.status(404).send(Service.notFoundStatus(req.params.name));
    })
    .catch(next);
  } else {
    Service.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((service) => service ? res.status(200).send(service) : res.status(200).send({}))
    .catch(next);
  }
});

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiV1OpenapiV3), (req, res, next) => {
  Service.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
  .then((service) => service ? service.delete() : Promise.resolve())
  .then((service) => {
    if (service) {
      return res.status(200).send(service.successfulStatus());
    }
    return res.status(404).send(Service.notFoundStatus(req.params.name));
  })
  .catch(next);
});

router.delete(routes, validSchema(apiV1OpenapiV3), (req, res, next) => {
  Service.find(req.body)
  .then((services) => Promise.all(services.map((service) => service.delete())))
  .then((service) => services ? res.status(200).send(service) : res.status(200).send({}))
  .catch(next);
});

module.exports = router;
