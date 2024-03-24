require('dotenv').config();
const express = require('express');
const db = require('./database/connection.js');
const { api, namespace, deployments } = require('./routes/index.js');

db.connect(process.env.DB_URL);

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  console.log(req.url);
  next();
})

app.use('/', api);
app.use('/api/v1/namespaces', namespace);
app.use(['/api/v1/namespaces/:namespace/deployment', '/apis/apps/v1/namespaces/:namespace/deployments'], deployments);

app.listen(8080);
