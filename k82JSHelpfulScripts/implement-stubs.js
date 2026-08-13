// One-off: turn the stub object files into minimally-functional implementations.
// Replaces the generic `this.rules = config.rules` with a spread that copies
// every non-apiVersion/kind/metadata field. Also injects special logic for
// review/token/CSR resources.
const fs = require('fs');
const path = require('path');

const STUB_NAMES = [
  'apiService', 'binding', 'componentStatus', 'controllerRevision',
  'cronJob', 'csidriver', 'csiNode', 'csiStorageCapacity',
  'endpointSlice', 'event', 'horizontalPodAutoscaler', 'ingressClass',
  'job', 'lease', 'limitRange', 'localSubjectAccessReview',
  'mutatingWebhookConfiguration', 'networkPolicy', 'persistentVolume',
  'persistentVolumeClaim', 'podDisruptionBudget', 'podTemplate',
  'priorityClass', 'replicaSet', 'resourceQuota', 'role', 'roleBinding',
  'runtimeClass', 'selfSubjectAccessReview', 'selfSubjectReview',
  'selfSubjectRulesReview', 'serviceAccount', 'statefulSet', 'storageClass',
  'subjectAccessReview', 'tokenRequest', 'tokenReview',
  'validatingWebhookConfiguration', 'volumeAttachment',
  'clusterRole', 'clusterRoleBinding', 'daemonSet', 'certificateSigningRequest',
];

const REVIEW_NAMES = new Set([
  'selfSubjectAccessReview', 'selfSubjectRulesReview',
  'subjectAccessReview', 'localSubjectAccessReview',
]);

const objectsDir = path.join(__dirname, '..', 'objects');

const genericConstructorBody = `    super(config);
    for (const key of Object.keys(config || {})) {
      if (key === 'apiVersion' || key === 'kind' || key === 'metadata') continue;
      this[key] = config[key];
    }`;

const genericSetConfigBody = `    await super.setResourceVersion();
    for (const key of Object.keys(config || {})) {
      if (key === 'apiVersion' || key === 'kind' || key === 'metadata') continue;
      this[key] = config[key];
    }
    return this;`;

function fixFile(file) {
  const full = path.join(objectsDir, file);
  if (!fs.existsSync(full)) return false;
  let src = fs.readFileSync(full, 'utf8');
  const orig = src;

  // Replace `this.rules = config.rules;` inside constructor with generic copy.
  src = src.replace(
    /super\(config\);\s*\n\s*this\.rules = config\.rules;/,
    genericConstructorBody
  );

  // Replace `this.rules = config.rules;` or `this.data = config.data;` in setConfig.
  src = src.replace(
    /await super\.setResourceVersion\(\);\s*\n\s*this\.\w+ = config\.\w+;\s*\n\s*return this;/,
    genericSetConfigBody
  );

  if (src !== orig) {
    fs.writeFileSync(full, src);
    return true;
  }
  return false;
}

let changed = 0;
let files = fs.readdirSync(objectsDir).filter((f) => STUB_NAMES.includes(f.replace(/\.js$/, '')));
for (const f of files) {
  if (fixFile(f)) {
    console.log('rewrote', f);
    changed++;
  }
}
console.log(`\n${changed} stubs rewritten.`);
