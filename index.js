require('dotenv').config();

process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err?.stack || err);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err?.stack || err);
});

const fs = require('fs');
const express = require('express');
const YAML = require('yaml');
const protobuf = require("protobufjs");
const db = require('./database/connection.js');
const {
  all,
  api,
  apiService,
  binding,
  certificateSigningRequest,
  clusterRole,
  clusterRoleBinding,
  componentStatus,
  configMap,
  controllerRevision,
  cronJob,
  csidriver,
  csiNode,
  csiStorageCapacity,
  daemonset,
  deployment,
  endpoints,
  endpointSlice,
  events,
  horizontalPodAutoscaler,
  ingressClass,
  job,
  lease,
  limitRange,
  localSubjectAccessReview,
  mutatingWebhookConfiguration,
  namespace,
  namespaceCheck,
  networkPolicy,
  node,
  openapi,
  persistentVolume,
  persistentVolumeClaim,
  pod,
  podDisruptionBudget,
  podTemplate,
  priorityClass,
  replicaset,
  replicationController,
  resourceQuota,
  role,
  roleBinding,
  runtimeClass,
  secret,
  selfSubjectReview,
  selfSubjectAccessReview,
  selfSubjectRulesReview,
  service,
  serviceAccount,
  statefulSet,
  storageClass,
  subjectAccessReview,
  tokenRequest,
  tokenReview,
  validatingWebhookConfiguration,
  version,
  volumeAttachment,
  discovery,
} = require('./routes/index.js');
const { killContainer, removeContainer } = require('./functions.js');
const Status = require('./objects/status.js');
const Object = require('./objects/object.js');
const nodeCleanup = require('node-cleanup');
const scheduler = require('./controllers/scheduler.js');
const nodes = require('./controllers/nodes.js');
const endpointsController = require('./controllers/endpoints.js');
const store = require('./store/index.js');

let dbNameIndex = process.argv.indexOf('-dbName');

if (dbNameIndex !== -1) {
  process.env.DB_URL = `mongodb://localhost:27017`;
}

db.connect(process.env.DB_URL);

const app = express();

const protobufTypes = protobuf.loadSync([
  `${__dirname}/proto/apps_v1_service.proto`,
  `${__dirname}/proto/certificates_v1_service.proto`,
  `${__dirname}/proto/core_v1_service.proto`,
  `${__dirname}/proto/networking_v1_service.proto`,
  `${__dirname}/proto/rbac_authorization_v1_service.proto`,
])

const isYaml = (req) => `${req.headers['content-type']}`.includes('yaml');

app.use(express.json({ type: ['application/json', 'application/merge-patch+json', 'application/strategic-merge-patch+json'] }));
// JSON Patch (RFC 6902) body is an array; still parse as JSON.
app.use(express.json({ type: 'application/json-patch+json' }));
app.use(express.raw({ type: 'application/vnd.kubernetes.protobuf' }));
app.use(express.raw({ type: 'text/vnd.kubernetes.protobuf' }));
// Covers application/yaml, text/yaml and application/apply-patch+yaml. These
// used to run through express.raw with a `verify` hook that parsed the YAML —
// but body-parser overwrites req.body with the raw Buffer after verify returns,
// so every YAML body was silently discarded and the object saved empty.
// apply-patch+yaml was worse: it was in the express.json list, so a YAML body
// failed JSON.parse and the request 400'd.
app.use(express.text({ type: isYaml }));
app.use((req, res, next) => {
  if (isYaml(req) && typeof req.body === 'string' && req.body.length) {
    try {
      req.body = YAML.parse(req.body);
    } catch (e) {
      return next(new Status({
        status: 'Failure',
        reason: 'BadRequest',
        code: 400,
        message: `invalid YAML body: ${e.message}`,
      }));
    }
  }
  next();
});

app.use((req, res, next) => {
  req.protobufTypes = protobufTypes;
  console.log(req.method);
  console.log(req.headers, req.body, req.url);
  next();
})

app.use((req, res, next) => {
    let send = res.send;
    res.send = c => {
        console.log(`Response Code: ${res.statusCode}`);
        console.log("Response Body: ", c);
        res.send = send;
        console.log('------------------');
        return res.send(c);
    }
    next();
});

app.use(all);
app.use(api);
app.use(openapi);
app.use(node);
app.use(apiService);
app.use(binding);
app.use(componentStatus);
app.use(lease);
app.use(runtimeClass);
app.use(storageClass);
app.use(version);

app.use(namespace);
app.use(namespaceCheck);
app.use(certificateSigningRequest);
app.use(clusterRole);
app.use(clusterRoleBinding);
app.use(configMap);
app.use(controllerRevision);
app.use(cronJob);
app.use(csidriver);
app.use(csiNode);
app.use(csiStorageCapacity);
app.use(daemonset);
app.use(deployment);
app.use(endpoints);
app.use(endpointSlice);
app.use(events);
app.use(horizontalPodAutoscaler);
app.use(ingressClass);
app.use(job);
app.use(limitRange);
app.use(localSubjectAccessReview);
app.use(mutatingWebhookConfiguration);
app.use(networkPolicy);
app.use(persistentVolume);
app.use(persistentVolumeClaim);
app.use(pod);
app.use(podDisruptionBudget);
app.use(podTemplate);
app.use(priorityClass);
app.use(replicaset);
app.use(replicationController);
app.use(resourceQuota);
app.use(role);
app.use(roleBinding);
app.use(secret);
app.use(selfSubjectReview)
app.use(selfSubjectAccessReview);
app.use(selfSubjectRulesReview);
app.use(service);
app.use(serviceAccount);
app.use(statefulSet);
app.use(subjectAccessReview);
app.use(tokenRequest)
app.use(tokenReview);
app.use(validatingWebhookConfiguration);
app.use(volumeAttachment);

// Last: /apis/{group}/{version} is a two-segment pattern that would otherwise
// shadow two-segment resource paths such as /apis/v1/componentstatuses.
app.use(discovery);

app.get('/', (req, res, next) => {
  let routes = app._router.stack.map((middleware) => {
    if (middleware.route) {
      return middleware.route;
    } else if (middleware.name === 'router') {
      return middleware.handle.stack.map((handler) => handler.route ? handler.route : undefined);
    }
  });
  res.json({
    paths: routes.flat(Infinity).filter((e) => e).map((e) => e.path).flat(Infinity)
  });
});

app.get('/ping', (req, res) => {
  if (db.connectionStatus() === 1) {
    return res.sendStatus(200);
  }
  return res.sendStatus(502);
})

app.use((req, res) => {
  res.status(404).send(Object.notFoundStatus());
})

app.use((err, req, res, next) => {
  if (err instanceof Status) {
    res.status(err.code).send(err);
  } else if (err && err.name === 'ValidationError') {
    res.status(422).send(Object.unprocessableContentStatus(undefined, undefined, undefined, err.message, 'Invalid'));
  } else if (err && err.type === 'entity.parse.failed') {
    res.status(400).send(Object.unprocessableContentStatus(undefined, undefined, undefined, err.message, 'BadRequest'));
  } else if (err && Array.isArray(err.validationErrors)) {
    // A request that doesn't match the OpenAPI schema is the client's problem,
    // not ours; this used to fall through to a 500.
    res.status(400).send(new Status({
      status: 'Failure',
      reason: 'BadRequest',
      code: 400,
      message: err.validationErrors
        .map((e) => `${e.instancePath || 'request'} ${e.message}`)
        .join('; '),
    }));
  } else {
    console.error(err.stack);
    console.log(err);
    res.status(500).send(Object.internalServerErrorStatus());
  }
  return next();
});

app.listen(8080);
app.listen(6443);

// The store hands out resourceVersions, so it comes up before anything that
// writes an object. If it can't -- a taken port, an unreadable directory --
// the server keeps working off the database counter rather than refusing to
// boot, and says which one it ended up on, because "which thing is ordering my
// writes" is not something to leave ambiguous.
store.start()
  .then(() => Object.adoptResourceVersion())
  .then((revision) => {
    if (store.get()) {
      console.log(`store: raft-backed, resourceVersion continues from ${revision}`);
    }
  })
  .catch((err) => console.warn('[store]', err?.message || err))
  // Bring up the simulated fleet before the scheduler starts looking for
  // somewhere to put things.
  .then(() => nodes.ensure())
  .catch((err) => console.warn('[nodes]', err?.message || err))
  .finally(() => {
    scheduler.start();
    endpointsController.start();
  });

nodeCleanup(async (exitCode, signal) => {
  if (signal) {
    if (dbNameIndex != -1) {
      await killContainer(process.argv[dbNameIndex + 1]);
      await removeContainer(process.argv[dbNameIndex + 1]);
    }
    process.kill(process.pid, signal);
  }
});
