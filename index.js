require('dotenv').config();
const express = require('express');
const db = require('./database/connection.js');
const { api, namespace, namespaceCheck, deployment, endpoints, pod, service, ingress, secret, configMap, certificatesigningrequest, clusterRole, role, clusterRoleBinding, roleBinding, openapi, serviceAccount, node, version } = require('./routes/index.js');
const { killContainer, removeContainer } = require('./functions.js');
const { Object, Status } = require('./objects');
const nodeCleanup = require('node-cleanup');

let dnsServerIndex = process.argv.indexOf('-dnsServer');

if (dnsServerIndex === -1) {
  console.error('Could not find local DNS server!');
  console.error('Did you run npm start?');
  process.exit(1);
}

let dbNameIndex = process.argv.indexOf('-dbName');

if (dbNameIndex !== -1) {
  process.env.DB_URL = `mongodb://localhost:27017`;
}

process.env.DNS_SERVER = process.argv[dnsServerIndex + 1];

db.connect(process.env.DB_URL);

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  console.log(req.headers, req.body, req.url);
  console.log('------------------');
  next();
})

app.use(api);
app.use(openapi);

app.use(namespace);
app.use(namespaceCheck);
app.use(pod);
app.use(service);
app.use(ingress);
app.use(endpoints);
app.use(deployment);
app.use(secret);
app.use(configMap);
app.use(node);
app.use(serviceAccount);
app.use(version);

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

nodeCleanup(async (exitCode, signal) => {
  if (signal) {
    if (dbNameIndex != -1) {
      console.log(process.argv[dbNameIndex + 1]);
      await killContainer(process.argv[dbNameIndex + 1]);
      await removeContainer(process.argv[dbNameIndex + 1]);
    }
    process.kill(process.pid, signal);
  }
});
