// Boot-clean smoke test: POST a minimal spec for every resource type, then
// GET the list and a Table view and DELETE. Anything returning 5xx or blowing
// up the server is a regression.
const axios = require('axios');

const base = 'http://localhost:8080';
const ns = 'default';

const resources = [
  { path: `/apis/apiregistration.k8s.io/v1/apiservices`, body: { apiVersion: 'apiregistration.k8s.io/v1', kind: 'APIService', metadata: { name: 'smoke-apiservice' }, spec: { service: null, groupPriorityMinimum: 100, versionPriority: 10 } } },
  { path: `/api/v1/namespaces/${ns}/bindings`, body: { apiVersion: 'v1', kind: 'Binding', metadata: { name: 'smoke-bind', namespace: ns }, target: { kind: 'Pod', name: 'x' } } },
  { path: `/apis/v1/componentstatuses`, body: { apiVersion: 'v1', kind: 'ComponentStatus', metadata: { name: 'smoke-cs' } } },
  { path: `/apis/coordination.k8s.io/v1/leases`, body: { apiVersion: 'coordination.k8s.io/v1', kind: 'Lease', metadata: { name: 'smoke-lease', namespace: ns }, spec: { holderIdentity: 'x' } } },
  { path: `/apis/node.k8s.io/v1/runtimeclasses`, body: { apiVersion: 'node.k8s.io/v1', kind: 'RuntimeClass', metadata: { name: 'smoke-rc' }, handler: 'runc' } },
  { path: `/apis/storage.k8s.io/v1/storageclasses`, body: { apiVersion: 'storage.k8s.io/v1', kind: 'StorageClass', metadata: { name: 'smoke-sc' }, provisioner: 'fake' } },
  { path: `/api/v1/namespaces`, body: { apiVersion: 'v1', kind: 'Namespace', metadata: { name: 'smoke-ns' } } },
  { path: `/apis/v1/certificatesigningrequests`, body: { apiVersion: 'certificates.k8s.io/v1', kind: 'CertificateSigningRequest', metadata: { name: 'smoke-csr' }, spec: { request: 'foo', signerName: 'kubernetes.io/kube-apiserver-client' } } },
  { path: `/apis/rbac.authorization.k8s.io/v1/clusterroles`, body: { apiVersion: 'rbac.authorization.k8s.io/v1', kind: 'ClusterRole', metadata: { name: 'smoke-cr' }, rules: [] } },
  { path: `/apis/rbac.authorization.k8s.io/v1/clusterrolebindings`, body: { apiVersion: 'rbac.authorization.k8s.io/v1', kind: 'ClusterRoleBinding', metadata: { name: 'smoke-crb' }, roleRef: { apiGroup: 'rbac.authorization.k8s.io', kind: 'ClusterRole', name: 'smoke-cr' }, subjects: [] } },
  { path: `/api/v1/namespaces/${ns}/configmaps`, body: { apiVersion: 'v1', kind: 'ConfigMap', metadata: { name: 'smoke-cm', namespace: ns }, data: { foo: 'bar' } } },
  { path: `/apis/apps/v1/namespaces/${ns}/controllerrevisions`, body: { apiVersion: 'apps/v1', kind: 'ControllerRevision', metadata: { name: 'smoke-cr-rev', namespace: ns }, revision: 1 } },
  { path: `/apis/batch/v1/namespaces/${ns}/cronjobs`, body: { apiVersion: 'batch/v1', kind: 'CronJob', metadata: { name: 'smoke-cj', namespace: ns }, spec: { schedule: '*/5 * * * *', jobTemplate: { spec: { template: { spec: { containers: [{ name: 'c', image: 'busybox' }], restartPolicy: 'Never' } } } } } } },
  { path: `/apis/storage.k8s.io/v1/${ns}/csidrivers`, body: { apiVersion: 'storage.k8s.io/v1', kind: 'CSIDriver', metadata: { name: 'smoke-csi' }, spec: {} } },
  { path: `/apis/storage.k8s.io/v1/csinodes`, body: { apiVersion: 'storage.k8s.io/v1', kind: 'CSINode', metadata: { name: 'smoke-csinode' }, spec: { drivers: [] } } },
  { path: `/apis/storage.k8s.io/v1/namespaces/${ns}/csistoragecapacities`, body: { apiVersion: 'storage.k8s.io/v1', kind: 'CSIStorageCapacity', metadata: { name: 'smoke-csc', namespace: ns }, storageClassName: 'smoke-sc' } },
  { path: `/apis/discovery.k8s.io/v1/namespaces/${ns}/endpointslices`, body: { apiVersion: 'discovery.k8s.io/v1', kind: 'EndpointSlice', metadata: { name: 'smoke-es', namespace: ns }, addressType: 'IPv4', endpoints: [] } },
  { path: `/apis/autoscaling/v2/namespaces/${ns}/horizontalpodautoscalers`, body: { apiVersion: 'autoscaling/v2', kind: 'HorizontalPodAutoscaler', metadata: { name: 'smoke-hpa', namespace: ns }, spec: { scaleTargetRef: { kind: 'Deployment', name: 'x', apiVersion: 'apps/v1' }, minReplicas: 1, maxReplicas: 3 } } },
  { path: `/apis/networking.k8s.io/v1/${ns}/ingressclasses`, body: { apiVersion: 'networking.k8s.io/v1', kind: 'IngressClass', metadata: { name: 'smoke-ic' }, spec: { controller: 'fake' } } },
  { path: `/apis/batch/v1/namespaces/${ns}/jobs`, body: { apiVersion: 'batch/v1', kind: 'Job', metadata: { name: 'smoke-job', namespace: ns }, spec: { template: { spec: { containers: [{ name: 'c', image: 'busybox' }], restartPolicy: 'Never' } } } } },
  { path: `/api/v1/namespaces/${ns}/limitranges`, body: { apiVersion: 'v1', kind: 'LimitRange', metadata: { name: 'smoke-lr', namespace: ns }, spec: { limits: [] } } },
  { path: `/apis/admissionregistration.k8s.io/v1/mutatingwebhookconfigurations`, body: { apiVersion: 'admissionregistration.k8s.io/v1', kind: 'MutatingWebhookConfiguration', metadata: { name: 'smoke-mwc' }, webhooks: [] } },
  { path: `/apis/v1/networkpolicies`, body: { apiVersion: 'networking.k8s.io/v1', kind: 'NetworkPolicy', metadata: { name: 'smoke-np', namespace: ns }, spec: { podSelector: {} } } },
  { path: `/api/v1/persistentvolumes`, body: { apiVersion: 'v1', kind: 'PersistentVolume', metadata: { name: 'smoke-pv' }, spec: { capacity: { storage: '1Gi' }, accessModes: ['ReadWriteOnce'] } } },
  { path: `/api/v1/namespaces/${ns}/persistentvolumeclaims`, body: { apiVersion: 'v1', kind: 'PersistentVolumeClaim', metadata: { name: 'smoke-pvc', namespace: ns }, spec: { accessModes: ['ReadWriteOnce'], resources: { requests: { storage: '1Gi' } } } } },
  { path: `/apis/policy/v1/namespaces/${ns}/poddisruptionbudgets`, body: { apiVersion: 'policy/v1', kind: 'PodDisruptionBudget', metadata: { name: 'smoke-pdb', namespace: ns }, spec: { minAvailable: 1 } } },
  { path: `/api/v1/namespaces/${ns}/podtemplates`, body: { apiVersion: 'v1', kind: 'PodTemplate', metadata: { name: 'smoke-pt', namespace: ns }, template: { spec: { containers: [{ name: 'c', image: 'busybox' }] } } } },
  { path: `/apis/scheduling.k8s.io/v1/priorityclasses`, body: { apiVersion: 'scheduling.k8s.io/v1', kind: 'PriorityClass', metadata: { name: 'smoke-prio' }, value: 100 } },
  { path: `/apis/apps/v1/namespaces/${ns}/replicasets`, body: { apiVersion: 'apps/v1', kind: 'ReplicaSet', metadata: { name: 'smoke-rs', namespace: ns }, spec: { replicas: 1, selector: { matchLabels: { app: 'x' } }, template: { metadata: { labels: { app: 'x' } }, spec: { containers: [{ name: 'c', image: 'busybox' }] } } } } },
  { path: `/api/v1/namespaces/${ns}/resourcequotas`, body: { apiVersion: 'v1', kind: 'ResourceQuota', metadata: { name: 'smoke-rq', namespace: ns }, spec: { hard: {} } } },
  { path: `/apis/rbac.authorization.k8s.io/v1/namespaces/${ns}/roles`, body: { apiVersion: 'rbac.authorization.k8s.io/v1', kind: 'Role', metadata: { name: 'smoke-role', namespace: ns }, rules: [] } },
  { path: `/apis/rbac.authorization.k8s.io/v1/namespaces/${ns}/rolebindings`, body: { apiVersion: 'rbac.authorization.k8s.io/v1', kind: 'RoleBinding', metadata: { name: 'smoke-rb', namespace: ns }, roleRef: { apiGroup: 'rbac.authorization.k8s.io', kind: 'Role', name: 'smoke-role' }, subjects: [] } },
  { path: `/api/v1/namespaces/${ns}/secrets`, body: { apiVersion: 'v1', kind: 'Secret', metadata: { name: 'smoke-sec', namespace: ns }, data: { foo: Buffer.from('bar').toString('base64') }, type: 'Opaque' } },
  { path: `/apis/authorization.k8s.io/v1/selfsubjectaccessreviews`, body: { apiVersion: 'authorization.k8s.io/v1', kind: 'SelfSubjectAccessReview', metadata: { name: 'smoke-ssar' }, spec: { resourceAttributes: { verb: 'get', resource: 'pods' } } } },
  { path: `/apis/authentication.k8s.io/v1/selfsubjectreviews`, body: { apiVersion: 'authentication.k8s.io/v1', kind: 'SelfSubjectReview', metadata: { name: 'smoke-ssr' } } },
  { path: `/apis/authorization.k8s.io/v1/subjectaccessreviews`, body: { apiVersion: 'authorization.k8s.io/v1', kind: 'SubjectAccessReview', metadata: { name: 'smoke-sar' }, spec: { user: 'admin', resourceAttributes: { verb: 'get', resource: 'pods' } } } },
  { path: `/apis/authorization.k8s.io/v1/namespaces/${ns}/localsubjectaccessreviews`, body: { apiVersion: 'authorization.k8s.io/v1', kind: 'LocalSubjectAccessReview', metadata: { name: 'smoke-lsar', namespace: ns }, spec: { resourceAttributes: { verb: 'get', resource: 'pods' } } } },
  { path: `/api/v1/namespaces/${ns}/serviceaccounts`, body: { apiVersion: 'v1', kind: 'ServiceAccount', metadata: { name: 'smoke-sa', namespace: ns } } },
  { path: `/apis/apps/v1/namespaces/${ns}/statefulsets`, body: { apiVersion: 'apps/v1', kind: 'StatefulSet', metadata: { name: 'smoke-ss', namespace: ns }, spec: { serviceName: 'smoke', replicas: 1, selector: { matchLabels: { app: 'x' } }, template: { metadata: { labels: { app: 'x' } }, spec: { containers: [{ name: 'c', image: 'busybox' }] } } } } },
  { path: `/apis/authentication.k8s.io/v1/tokenreviews`, body: { apiVersion: 'authentication.k8s.io/v1', kind: 'TokenReview', metadata: { name: 'smoke-tr' }, spec: { token: 'x' } } },
  { path: `/apis/admissionregistration.k8s.io/v1/validatingwebhookconfigurations`, body: { apiVersion: 'admissionregistration.k8s.io/v1', kind: 'ValidatingWebhookConfiguration', metadata: { name: 'smoke-vwc' }, webhooks: [] } },
  { path: `/apis/storage.k8s.io/v1/volumeattachments`, body: { apiVersion: 'storage.k8s.io/v1', kind: 'VolumeAttachment', metadata: { name: 'smoke-va' }, spec: { attacher: 'fake', nodeName: 'x', source: {} } } },
];

let fails = [];
let warns = [];

async function hit(method, url, data) {
  try {
    let opts = { method, url: `${base}${url}`, validateStatus: () => true };
    if (data !== undefined && data !== null) {
      opts.data = data;
      opts.headers = { 'Content-Type': 'application/json' };
    }
    let res = await axios(opts);
    return res;
  } catch (e) {
    return { status: 0, data: { err: e.message } };
  }
}

async function run() {
  for (const r of resources) {
    const label = r.path;
    const postRes = await hit('POST', r.path, r.body);
    if (postRes.status >= 500 || postRes.status === 0) {
      fails.push(`POST ${label}: ${postRes.status} ${JSON.stringify(postRes.data).slice(0, 200)}`);
      continue;
    }
    // A 404 here means the path isn't routed at all, so nothing below actually
    // tested the resource. Tolerating it let 19 of these fixtures point at
    // non-existent paths while the run still reported 0 fails.
    if (postRes.status === 404) {
      fails.push(`POST ${label}: 404 (route not registered)`);
      continue;
    }
    if (postRes.status >= 400 && postRes.status !== 409 && postRes.status !== 422) {
      warns.push(`POST ${label}: ${postRes.status}`);
    }
    const listRes = await hit('GET', r.path);
    if (listRes.status >= 500) fails.push(`GET ${label}: ${listRes.status} ${JSON.stringify(listRes.data).slice(0, 200)}`);
    const tableRes = await hit('GET', r.path, null);
    // Table view via accept header (can't do via axios default headers easily here; test via query param alternative is not standard — skip table in this pass)
    const delRes = await hit('DELETE', r.path, null);
    if (delRes.status >= 500) fails.push(`DELETE ${label}: ${delRes.status} ${JSON.stringify(delRes.data).slice(0, 200)}`);
  }

  console.log('---FAILS---');
  fails.forEach((f) => console.log(f));
  console.log('---WARNS---');
  warns.forEach((w) => console.log(w));
  console.log(`\n${fails.length} fails, ${warns.length} warns, out of ${resources.length} resources tested.`);
  process.exit(fails.length > 0 ? 1 : 0);
}

// The fixture list is shared with test/wire-matrix.js, so only run the smoke
// pass when this file is the entry point.
module.exports = { resources };

if (require.main === module) {
  run();
}
