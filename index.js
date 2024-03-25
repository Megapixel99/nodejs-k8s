require('dotenv').config();
require('./eventHandlers');
const express = require('express');
const db = require('./database/connection.js');
const { api, namespace, deployment, pod, openapi, tables } = require('./routes/index.js');

db.connect(process.env.DB_URL);

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  console.log(req.url);
  next();
})

app.use('/', api);

app.use('/api/v1/namespaces', namespace);
app.use('/api/v1/namespaces', tables.namespace);

app.use(['/apis/apps/v1/namespaces/:namespace/pods', '/api/v1/namespaces/:namespace/pods'], pod);
app.use('/api/v1/namespaces/:namespace/pods', tables.pod);

app.use(['/apis/apps/v1/namespaces/:namespace/deployments', '/api/v1/namespaces/:namespace/deployments'], deployment);
app.use('/api/v1/namespaces/:namespace/deployments', tables.deployment);

app.use('/', openapi.router);

app.listen(8080);
