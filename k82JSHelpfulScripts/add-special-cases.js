// Second pass: inject static create() overrides on review/token/CSR resources
// so that POSTs return a populated `status` block the way real Kubernetes does.
const fs = require('fs');
const path = require('path');

const objectsDir = path.join(__dirname, '..', 'objects');

const SNIPPETS = {
  selfSubjectAccessReview: `
  static create(config) {
    config = { ...config, status: { allowed: true, reason: 'simulated', ...(config.status || {}) } };
    return super.create(config);
  }
`,
  localSubjectAccessReview: `
  static create(config) {
    config = { ...config, status: { allowed: true, reason: 'simulated', ...(config.status || {}) } };
    return super.create(config);
  }
`,
  subjectAccessReview: `
  static create(config) {
    config = { ...config, status: { allowed: true, reason: 'simulated', ...(config.status || {}) } };
    return super.create(config);
  }
`,
  selfSubjectRulesReview: `
  static create(config) {
    config = { ...config, status: { resourceRules: [{ verbs: ['*'], apiGroups: ['*'], resources: ['*'] }], nonResourceRules: [{ verbs: ['*'], nonResourceURLs: ['*'] }], incomplete: false, ...(config.status || {}) } };
    return super.create(config);
  }
`,
  selfSubjectReview: `
  static create(config) {
    config = { ...config, status: { userInfo: { username: 'system:admin', groups: ['system:masters'] }, ...(config.status || {}) } };
    return super.create(config);
  }
`,
  tokenRequest: `
  static create(config) {
    let token = require('crypto').randomBytes(32).toString('hex');
    config = { ...config, status: { token, expirationTimestamp: new Date(Date.now() + 3600 * 1000).toISOString(), ...(config.status || {}) } };
    return super.create(config);
  }
`,
  tokenReview: `
  static create(config) {
    config = { ...config, status: { authenticated: true, user: { username: 'system:admin', groups: ['system:masters'] }, ...(config.status || {}) } };
    return super.create(config);
  }
`,
  certificateSigningRequest: `
  static create(config) {
    let selfsigned = require('selfsigned');
    let pem = selfsigned.generate([{ name: 'commonName', value: config?.metadata?.name || 'csr' }], { days: 365 });
    config = { ...config, status: { certificate: Buffer.from(pem.cert).toString('base64'), conditions: [{ type: 'Approved', status: 'True', reason: 'simulated' }], ...(config.status || {}) } };
    return super.create(config);
  }
`,
};

for (const [file, snippet] of Object.entries(SNIPPETS)) {
  const full = path.join(objectsDir, `${file}.js`);
  if (!fs.existsSync(full)) {
    console.log('missing', full);
    continue;
  }
  let src = fs.readFileSync(full, 'utf8');
  if (src.includes('static create(config)')) {
    console.log('already has create, skipping', file);
    continue;
  }
  // Inject right after `static Model = Model;`
  src = src.replace(/(static Model = Model;\s*\n)/, `$1${snippet}`);
  fs.writeFileSync(full, src);
  console.log('injected', file);
}
