const router = require('express').Router();
const { ConfigMap } = require('../objects');
const { apiAppsV1OpenApiV3, apiV1OpenapiV3, validSchema } = require('./openapi.js');

let routes = ['/api/v1/namespaces/:namespace/configmaps'];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  ConfigMap.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
  .then((configMap) => {
    if (configMap) {
      return res.staus(200).send(configMap);
    }
    return res.status(404).send(ConfigMap.notFoundStatus(req.params.name));
  })
  .catch(next);
});

router.get(routes, validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  if (req.headers?.accept?.split(';').find((e) => e === 'as=Table')) {
    return ConfigMap.table({
      ...req.query,
      namespace: req.params.namespace,
    })
      .then((configMapList) => res.status(200).send(configMapList))
      .catch(next);
  }
  ConfigMap.list({
    ...req.query,
    namespace: req.params.namespace,
  })
    .then((configMapList) => res.status(200).send(configMapList))
    .catch(next);
})

router.get('/api/v1/configmaps', validSchema(apiV1OpenapiV3), (req, res, next) => {
  if (req.headers?.accept?.split(';').find((e) => e === 'as=Table')) {
    return ConfigMap.table(req.query)
      .then((configMapList) => res.status(200).send(configMapList))
      .catch(next);
  }
  ConfigMap.list(req.query)
  .then((configMapList) => res.status(200).send(configMapList))
  .catch(next);
});

router.post(routes, validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  if (!req.body?.metadata?.creationTimestamp) {
    req.body.metadata.creationTimestamp = new Date();
  }
  if (!req.body?.metadata?.namespace) {
    req.body.metadata.namespace = (req.params.namespace || "default");
  }
  ConfigMap.create(req.body)
  .then((configMap) => res.status(201).send(configMap))
  .catch(next);
});

router.put(routes, validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  if (Object.keys(req.body).length > 0) {
    ConfigMap.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((configMap) => configMap ? configMap.update(req.body) : Promise.resolve())
    .then((configMap) => {
      if (configMap) {
        return res.staus(201).send(configMap);
      }
      return res.status(404).send(ConfigMap.notFoundStatus(req.params.name));
    })
    .catch(next);
  } else {
    ConfigMap.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((configMap) => {
      if (configMap) {
        return res.staus(200).send(configMap);
      }
      return res.status(404).send(ConfigMap.notFoundStatus(req.params.name));
    })
    .catch(next);
  }
});

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  if (Object.keys(req.body).length > 0) {
    ConfigMap.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((configMap) => configMap ? configMap.update(req.body) : Promise.resolve())
    .then((configMap) => {
      if (configMap) {
        return res.staus(201).send(configMap);
      }
      return res.status(404).send(ConfigMap.notFoundStatus(req.params.name));
    })
    .catch(next);
  } else {
    ConfigMap.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
    .then((configMap) => configMap ? res.staus(200).send(configMap) : res.status(200).send({}))
    .catch(next);
  }
});

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  ConfigMap.findOne({ 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace })
  .then((configMap) => configMap ? configMap.delete() : Promise.resolve())
  .then((configMap) => {
    if (configMap) {
      return res.staus(200).send(configMap.successfulStatus());
    }
    return res.status(404).send(ConfigMap.notFoundStatus(req.params.name));
  })
  .catch(next);
});

router.delete(routes, validSchema(apiAppsV1OpenApiV3), (req, res, next) => {
  ConfigMap.find(req.body)
  .then((configMaps) => Promise.all(configMaps.map((configMap) => configMap.delete())))
  .then((configMap) => configMaps ? res.staus(200).send(configMap) : res.status(200).send({}))
  .catch(next);
});

module.exports = router;
