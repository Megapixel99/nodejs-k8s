module.exports = {
  api: require('./api.js'),
  deployment: require('./deployment.js'),
  ingress: require('./ingress.js'),
  namespace: require('./namespace.js'),
  pod: require('./pod.js'),
  secret: require('./secret.js'),
  service: require('./service.js'),
  openapi: require('./openapi.js'),
  tables: {
    deployment: require('./tables/deployment.js'),
    ingress: require('./tables/ingress.js'),
    secret: require('./tables/secret.js'),
    namespace: require('./tables/namespace.js'),
    pod: require('./tables/pod.js'),
    service: require('./tables/service.js'),
  }
};
