// Group discovery. kubectl builds every request URL from what these endpoints
// say exists — a kind that isn't listed here can't be fetched at all, however
// complete its handler is ("the server doesn't have a resource type ...").
// /apis lists the groups; /apis/{group}/{version} lists that group's resources.
//
// `namespaced` and `plural` here have to match the routes we actually register:
// kubectl composes /apis/{group}/{version}[/namespaces/{ns}]/{plural} from
// them, so a mismatch produces a 404 that looks like a missing resource.
const router = require('express').Router();

const RESOURCES = [
  { group: 'admissionregistration.k8s.io', version: 'v1', kind: 'MutatingWebhookConfiguration', plural: 'mutatingwebhookconfigurations', singular: 'mutatingwebhookconfiguration', namespaced: false },
  { group: 'admissionregistration.k8s.io', version: 'v1', kind: 'ValidatingWebhookConfiguration', plural: 'validatingwebhookconfigurations', singular: 'validatingwebhookconfiguration', namespaced: false },
  { group: 'apiregistration.k8s.io', version: 'v1', kind: 'APIService', plural: 'apiservices', singular: 'apiservice', namespaced: false },
  { group: 'apps', version: 'v1', kind: 'ControllerRevision', plural: 'controllerrevisions', singular: 'controllerrevision', namespaced: true },
  { group: 'apps', version: 'v1', kind: 'DaemonSet', plural: 'daemonsets', singular: 'daemonset', namespaced: true, shortNames: ['ds'] },
  { group: 'apps', version: 'v1', kind: 'Deployment', plural: 'deployments', singular: 'deployment', namespaced: true, shortNames: ['deploy'] },
  { group: 'apps', version: 'v1', kind: 'ReplicaSet', plural: 'replicasets', singular: 'replicaset', namespaced: true, shortNames: ['rs'] },
  { group: 'apps', version: 'v1', kind: 'StatefulSet', plural: 'statefulsets', singular: 'statefulset', namespaced: true, shortNames: ['sts'] },
  { group: 'authentication.k8s.io', version: 'v1', kind: 'SelfSubjectReview', plural: 'selfsubjectreviews', singular: 'selfsubjectreview', namespaced: false, verbs: ['create'] },
  { group: 'authentication.k8s.io', version: 'v1', kind: 'TokenReview', plural: 'tokenreviews', singular: 'tokenreview', namespaced: false },
  { group: 'authorization.k8s.io', version: 'v1', kind: 'LocalSubjectAccessReview', plural: 'localsubjectaccessreviews', singular: 'localsubjectaccessreview', namespaced: true },
  { group: 'authorization.k8s.io', version: 'v1', kind: 'SelfSubjectAccessReview', plural: 'selfsubjectaccessreviews', singular: 'selfsubjectaccessreview', namespaced: false },
  { group: 'authorization.k8s.io', version: 'v1', kind: 'SelfSubjectRulesReview', plural: 'selfsubjectrulesreviews', singular: 'selfsubjectrulesreview', namespaced: false },
  { group: 'authorization.k8s.io', version: 'v1', kind: 'SubjectAccessReview', plural: 'subjectaccessreviews', singular: 'subjectaccessreview', namespaced: false },
  { group: 'autoscaling', version: 'v2', kind: 'HorizontalPodAutoscaler', plural: 'horizontalpodautoscalers', singular: 'horizontalpodautoscaler', namespaced: true, shortNames: ['hpa'] },
  { group: 'batch', version: 'v1', kind: 'CronJob', plural: 'cronjobs', singular: 'cronjob', namespaced: true, shortNames: ['cj'] },
  { group: 'batch', version: 'v1', kind: 'Job', plural: 'jobs', singular: 'job', namespaced: true },
  { group: 'certificates.k8s.io', version: 'v1', kind: 'CertificateSigningRequest', plural: 'certificatesigningrequests', singular: 'certificatesigningrequest', namespaced: false, shortNames: ['csr'] },
  // Cluster-scoped in real Kubernetes; this server stores leases without a
  // namespace and routes them at the cluster path, so say so.
  { group: 'coordination.k8s.io', version: 'v1', kind: 'Lease', plural: 'leases', singular: 'lease', namespaced: false },
  { group: 'discovery.k8s.io', version: 'v1', kind: 'EndpointSlice', plural: 'endpointslices', singular: 'endpointslice', namespaced: true },
  { group: 'networking.k8s.io', version: 'v1', kind: 'IngressClass', plural: 'ingressclasses', singular: 'ingressclass', namespaced: false },
  { group: 'networking.k8s.io', version: 'v1', kind: 'NetworkPolicy', plural: 'networkpolicies', singular: 'networkpolicy', namespaced: false, shortNames: ['netpol'] },
  { group: 'node.k8s.io', version: 'v1', kind: 'RuntimeClass', plural: 'runtimeclasses', singular: 'runtimeclass', namespaced: false },
  { group: 'policy', version: 'v1', kind: 'PodDisruptionBudget', plural: 'poddisruptionbudgets', singular: 'poddisruptionbudget', namespaced: true, shortNames: ['pdb'] },
  { group: 'rbac.authorization.k8s.io', version: 'v1', kind: 'ClusterRole', plural: 'clusterroles', singular: 'clusterrole', namespaced: false },
  { group: 'rbac.authorization.k8s.io', version: 'v1', kind: 'ClusterRoleBinding', plural: 'clusterrolebindings', singular: 'clusterrolebinding', namespaced: false },
  { group: 'rbac.authorization.k8s.io', version: 'v1', kind: 'Role', plural: 'roles', singular: 'role', namespaced: true },
  { group: 'rbac.authorization.k8s.io', version: 'v1', kind: 'RoleBinding', plural: 'rolebindings', singular: 'rolebinding', namespaced: true },
  { group: 'scheduling.k8s.io', version: 'v1', kind: 'PriorityClass', plural: 'priorityclasses', singular: 'priorityclass', namespaced: false, shortNames: ['pc'] },
  { group: 'storage.k8s.io', version: 'v1', kind: 'CSIDriver', plural: 'csidrivers', singular: 'csidriver', namespaced: false },
  { group: 'storage.k8s.io', version: 'v1', kind: 'CSINode', plural: 'csinodes', singular: 'csinode', namespaced: false },
  { group: 'storage.k8s.io', version: 'v1', kind: 'CSIStorageCapacity', plural: 'csistoragecapacities', singular: 'csistoragecapacity', namespaced: true },
  { group: 'storage.k8s.io', version: 'v1', kind: 'StorageClass', plural: 'storageclasses', singular: 'storageclass', namespaced: false, shortNames: ['sc'] },
  { group: 'storage.k8s.io', version: 'v1', kind: 'VolumeAttachment', plural: 'volumeattachments', singular: 'volumeattachment', namespaced: false },
];

// The core group. /api/v1 had no handler at all, so a client with a cold
// discovery cache couldn't resolve `pods` — the cache on disk was the only
// reason kubectl appeared to work.
const CORE_RESOURCES = [
  { kind: 'Binding', plural: 'bindings', singular: 'binding', namespaced: true, verbs: ['create'] },
  { kind: 'ComponentStatus', plural: 'componentstatuses', singular: 'componentstatus', namespaced: false, shortNames: ['cs'] },
  { kind: 'ConfigMap', plural: 'configmaps', singular: 'configmap', namespaced: true, shortNames: ['cm'] },
  { kind: 'Endpoints', plural: 'endpoints', singular: 'endpoints', namespaced: true, shortNames: ['ep'] },
  { kind: 'Event', plural: 'events', singular: 'event', namespaced: true, shortNames: ['ev'] },
  { kind: 'LimitRange', plural: 'limitranges', singular: 'limitrange', namespaced: true, shortNames: ['limits'] },
  { kind: 'Namespace', plural: 'namespaces', singular: 'namespace', namespaced: false, shortNames: ['ns'] },
  { kind: 'Node', plural: 'nodes', singular: 'node', namespaced: false, shortNames: ['no'] },
  { kind: 'PersistentVolume', plural: 'persistentvolumes', singular: 'persistentvolume', namespaced: false, shortNames: ['pv'] },
  { kind: 'PersistentVolumeClaim', plural: 'persistentvolumeclaims', singular: 'persistentvolumeclaim', namespaced: true, shortNames: ['pvc'] },
  { kind: 'Pod', plural: 'pods', singular: 'pod', namespaced: true, shortNames: ['po'] },
  { kind: 'PodTemplate', plural: 'podtemplates', singular: 'podtemplate', namespaced: true },
  { kind: 'ReplicationController', plural: 'replicationcontrollers', singular: 'replicationcontroller', namespaced: true, shortNames: ['rc'] },
  { kind: 'ResourceQuota', plural: 'resourcequotas', singular: 'resourcequota', namespaced: true, shortNames: ['quota'] },
  { kind: 'Secret', plural: 'secrets', singular: 'secret', namespaced: true },
  { kind: 'Service', plural: 'services', singular: 'service', namespaced: true, shortNames: ['svc'] },
  { kind: 'ServiceAccount', plural: 'serviceaccounts', singular: 'serviceaccount', namespaced: true, shortNames: ['sa'] },
];

const DEFAULT_VERBS = ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'];

function groupVersions() {
  let seen = new Map();
  for (const r of RESOURCES) {
    if (!seen.has(r.group)) {
      seen.set(r.group, new Set());
    }
    seen.get(r.group).add(r.version);
  }
  return seen;
}

function apiGroupList() {
  return {
    kind: 'APIGroupList',
    apiVersion: 'v1',
    groups: [...groupVersions()].map(([name, versions]) => {
      let list = [...versions].map((version) => ({ groupVersion: `${name}/${version}`, version }));
      return {
        name,
        versions: list,
        preferredVersion: list[0],
      };
    }),
  };
}

function apiResourceList(group, version) {
  let resources = RESOURCES.filter((r) => r.group === group && r.version === version);
  if (!resources.length) {
    return null;
  }
  return {
    kind: 'APIResourceList',
    apiVersion: 'v1',
    groupVersion: `${group}/${version}`,
    resources: resources.map((r) => ({
      name: r.plural,
      singularName: r.singular,
      namespaced: r.namespaced,
      kind: r.kind,
      verbs: r.verbs || DEFAULT_VERBS,
      ...(r.shortNames ? { shortNames: r.shortNames } : {}),
    })),
  };
}

function coreResourceList() {
  return {
    kind: 'APIResourceList',
    groupVersion: 'v1',
    apiVersion: 'v1',
    resources: CORE_RESOURCES.map((r) => ({
      name: r.plural,
      singularName: r.singular,
      namespaced: r.namespaced,
      kind: r.kind,
      verbs: r.verbs || DEFAULT_VERBS,
      ...(r.shortNames ? { shortNames: r.shortNames } : {}),
    })),
  };
}

router.get('/api/v1', (req, res) => res.json(coreResourceList()));

// Mounted after the resource routers so a two-segment resource path (e.g.
// /apis/v1/componentstatuses) is matched by its own handler first.
router.get('/apis/:group/:version', (req, res, next) => {
  let list = apiResourceList(req.params.group, req.params.version);
  if (!list) {
    return next();
  }
  return res.json(list);
});

module.exports = router;
module.exports.RESOURCES = RESOURCES;
module.exports.apiGroupList = apiGroupList;
module.exports.apiResourceList = apiResourceList;
module.exports.coreResourceList = coreResourceList;
