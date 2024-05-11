module.exports = {
  Deployment: require('./deployment.js'),
  Namespace: require('./namespace.js'),
  Object: require('./object.js'),
  Service: require('./service.js'),
  Status: require('./status.js'),
  Secret: require('./secret.js'),
  Ingress: require('./ingress.js'),
  ConfigMap: require('./configMap.js'),
  Endpoints: require('./endpoints.js'),
  CertificateSigningRequest: require('./certificateSigningRequest.js'),
  ClusterRole: require('./clusterRole.js'),
  Role: require('./role.js'),
  ClusterRoleBinding: require('./clusterRoleBinding.js'),
  RoleBinding: require('./roleBinding.js'),
  Node: require('./node.js'),
  ServiceAccount: require('./serviceAccount.js'),
  Event: require('./event.js'),
  Pod: require('./pod.js'),
  ReplicaSet: require('./replicaSet.js'),
  DaemonSet: require('./daemonSet.js'),
};
