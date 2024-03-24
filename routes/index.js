module.exports = {
  api: require('./api.js'),
  deployments: require('./deployment.js'),
  namespace: require('./namespace.js'),
  pod: require('./pod.js'),
  openapi: require('./openapi.js'),
  tables: {
    pod: require('./tables/pod.js'),
  }
};
