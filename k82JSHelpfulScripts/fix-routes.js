// One-off: rewrite the buggy `/api/${apiVersion}/:namespace/X` route pattern
// used across stub routes. Real Kubernetes paths are either
//   /api/v1/namespaces/:namespace/X   (namespaced v1 core)
// or
//   /apis/<group>/<ver>/namespaces/:namespace/X  (grouped namespaced)
// or
//   /apis/<group>/<ver>/X             (cluster-scoped grouped).
const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '..', 'routes');

// [fileBasename, newRoutePathTemplate, overrideApiVersion?]
const routes = [
  // Namespaced core v1
  ['limitRange.js', '/api/${apiVersion}/namespaces/:namespace/limitranges'],
  ['resourceQuota.js', '/api/${apiVersion}/namespaces/:namespace/resourcequotas'],
  ['persistentVolumeClaim.js', '/api/${apiVersion}/namespaces/:namespace/persistentvolumeclaims'],

  // Cluster-scoped core v1
  ['persistentVolume.js', '/api/${apiVersion}/persistentvolumes'],

  // Grouped namespaced
  ['controllerRevision.js', '/apis/apps/v1/namespaces/:namespace/controllerrevisions'],
  ['cronJob.js', '/apis/batch/v1/namespaces/:namespace/cronjobs'],
  ['job.js', '/apis/batch/v1/namespaces/:namespace/jobs'],
  ['horizontalPodAutoscaler.js', '/apis/autoscaling/v2/namespaces/:namespace/horizontalpodautoscalers'],
  ['podDisruptionBudget.js', '/apis/policy/v1/namespaces/:namespace/poddisruptionbudgets'],
  ['endpointSlice.js', '/apis/discovery.k8s.io/v1/namespaces/:namespace/endpointslices'],
  ['csiStorageCapacity.js', '/apis/storage.k8s.io/v1/namespaces/:namespace/csistoragecapacities'],
  ['localSubjectAccessReview.js', '/apis/authorization.k8s.io/v1/namespaces/:namespace/localsubjectaccessreviews'],

  // Cluster-scoped grouped
  ['priorityClass.js', '/apis/scheduling.k8s.io/v1/priorityclasses'],
  ['csiNode.js', '/apis/storage.k8s.io/v1/csinodes'],
  ['volumeAttachment.js', '/apis/storage.k8s.io/v1/volumeattachments'],
  ['mutatingWebhookConfiguration.js', '/apis/admissionregistration.k8s.io/v1/mutatingwebhookconfigurations'],
  ['validatingWebhookConfiguration.js', '/apis/admissionregistration.k8s.io/v1/validatingwebhookconfigurations'],
  ['tokenReview.js', '/apis/authentication.k8s.io/v1/tokenreviews'],
  ['subjectAccessReview.js', '/apis/authorization.k8s.io/v1/subjectaccessreviews'],
  ['selfSubjectAccessReview.js', '/apis/authorization.k8s.io/v1/selfsubjectaccessreviews'],
  ['selfSubjectRulesReview.js', '/apis/authorization.k8s.io/v1/selfsubjectrulesreviews'],
];

for (const [file, newPath] of routes) {
  let full = path.join(routesDir, file);
  if (!fs.existsSync(full)) { console.log('missing', file); continue; }
  let src = fs.readFileSync(full, 'utf8');
  let orig = src;
  src = src.replace(
    /const routes = \[`\/api\/\$\{[^}]+\.apiVersion\}\/:namespace\/[a-z]+`\];/,
    `const routes = [\`${newPath}\`];`
  );
  if (src !== orig) {
    fs.writeFileSync(full, src);
    console.log('rewrote', file, '→', newPath);
  } else {
    console.log('skipped', file, '(no match)');
  }
}
