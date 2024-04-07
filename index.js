require('dotenv').config();
const express = require('express');
const db = require('./database/connection.js');
const { api, namespace, deployment, pod, service, ingress, secret, openapi, tables } = require('./routes/index.js');
const { buildImage } = require('./functions.js');

let dnsServerIndex = process.argv.indexOf('-dnsServer');

if (dnsServerIndex === -1) {
  console.error('Could not find local DNS server!');
  console.error('Did you run npm start?');
  process.exit(1);
}

process.env.DNS_SERVER = process.argv[dnsServerIndex + 1];

db.connect(process.env.DB_URL);

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  console.log(req.headers, req.url);
  console.log('------------------');
  next();
})

app.use('/', api);

app.use(namespace);
app.use('/api/v1/namespaces', tables.namespace);

app.use(pod);
app.use('/api/v1/namespaces/:namespace/pods', tables.pod);

app.use(service);
app.use('/api/v1/namespaces/:namespace/services', tables.service);

app.use(ingress);
app.use('/api/v1/namespaces/:namespace/ingresses', tables.ingress);

app.use(deployment);
app.use('/api/v1/namespaces/:namespace/deployments', tables.deployment);

app.use(secret);
app.use('/api/v1/namespaces/:namespace/secrets', tables.secret);

app.use('/', openapi.router);

app.use((err, req, res, next) => {
  console.error(err.stack);
  console.log(err);
  let errRes = {
    status: 'ERROR',
    message: {
      code: err?.status || 500,
      reason: err.cause || 'An unknown error occured. Please see the logs.',
      err: err?.response?.data || err?.message,
    },
  };
  res.status(err?.status || 500).send(errRes);
  return next();
});

app.listen(8080);
