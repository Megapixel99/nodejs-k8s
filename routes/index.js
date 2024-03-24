module.exports = {
  api: require('./api.js'),
  deployment: require('./deployment.js'),
  namespace: require('./namespace.js'),
  pod: require('./pod.js'),
  openapi: require('./openapi.js'),
  tables: {
    deployment: require('./tables/deployment.js'),
    namespace: require('./tables/namespace.js'),
    pod: require('./tables/pod.js'),
  }
};
