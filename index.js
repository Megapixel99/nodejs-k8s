require('dotenv').config();
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
} = require('./routes/index.js');
const { killContainer, removeContainer } = require('./functions.js');
const Status = require('./objects/status.js');
const Object = require('./objects/object.js');
const nodeCleanup = require('node-cleanup');

// let dnsServerIndex = process.argv.indexOf('-dnsServer');
//
// if (dnsServerIndex === -1) {
//   console.error('Could not find local DNS server!');
//   console.error('Did you run npm start?');
//   process.exit(1);
// }

let dbNameIndex = process.argv.indexOf('-dbName');

if (dbNameIndex !== -1) {
  process.env.DB_URL = `mongodb://localhost:27017`;
}

// process.env.DNS_SERVER = process.argv[dnsServerIndex + 1];

db.connect(process.env.DB_URL);

const app = express();

const protobufTypes = protobuf.loadSync([
  `${__dirname}/proto/apps_v1_service.proto`,
  `${__dirname}/proto/certificates_v1_service.proto`,
  `${__dirname}/proto/core_v1_service.proto`,
  `${__dirname}/proto/networking_v1_service.proto`,
  `${__dirname}/proto/rbac_authorization_v1_service.proto`,
])

const ymlToJSON = (req, res, buf, encoding) => {
  if (buf && Buffer.isBuffer(buf)) {
    try {
      req.body = YAML.parse(buf.toString());
    } catch (e) {
      req.body = buf.toString();
    }
  }
}

app.use(express.json());
app.use(express.raw({ type: 'application/vnd.kubernetes.protobuf' }));
app.use(express.raw({ type: 'text/vnd.kubernetes.protobuf' }));
app.use(express.raw({ verify: ymlToJSON, type: 'application/yaml' }));
app.use(express.raw({ verify: ymlToJSON, type: 'text/yaml' }));

app.use((req, res, next) => {
  req.protobufTypes = protobufTypes;
  console.log(req.method);
  console.log(req.headers, req.body, req.url);
  next();
})

app.use(all);
app.use(api);
app.use(openapi);
app.use(node);
app.use(apiService);
app.use(binding);
app.use(componentStatus);
app.use(lease);
app.use(runtimeClass);
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
app.use(storageClass);
app.use(subjectAccessReview);
app.use(tokenRequest)
app.use(tokenReview);
app.use(validatingWebhookConfiguration);
app.use(volumeAttachment);

app.get('/', (req, res, next) => {
  let routes = app._router.stack.map((middleware) => {
    if (middleware.route) {
      return middleware.route;
    } else if (middleware.name === 'router') {
      return middleware.handle.stack.map((handler) => handler.route ? handler.route : undefined);
    }
  });
  res.json({
    paths: routes.flat(Math.Infinity).filter((e) => e).map((e) => e.path).flat(Math.Infinity)
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
  } else {
    console.error(err.stack);
    console.log(err);
    res.status(500).send(Object.internalServerErrorStatus());
  }
  return next();
});

app.listen(8080);
app.listen(6443);

nodeCleanup(async (exitCode, signal) => {
  if (signal) {
    if (dbNameIndex != -1) {
      await killContainer(process.argv[dbNameIndex + 1]);
      await removeContainer(process.argv[dbNameIndex + 1]);
    }
    process.kill(process.pid, signal);
  }
});
