const router = require('express').Router();
const { Namespace } = require('../objects');

// Anything addressed inside a namespace that doesn't exist is a 404 in
// Kubernetes — creating a pod in a typo'd namespace fails rather than quietly
// producing an object nobody will ever look for. This was written for
// /api/v1 only, answered 403 instead of 404, and matched the namespace object's
// own routes (so `get ns missing` would have 403'd instead of 404'ing), which
// is presumably why it was left unmounted.
//
// Matches /api/v1/namespaces/{ns}/… and /apis/{group}/{version}/namespaces/{ns}/…
// and only when something follows the namespace segment.
const NAMESPACED_PATH = /^\/(?:api\/v[^/]+|apis\/[^/]+\/[^/]+)\/namespaces\/([^/]+)\/.+/;

router.use((req, res, next) => {
  let match = NAMESPACED_PATH.exec(req.path);
  if (!match) {
    return next();
  }
  let namespace = match[1];
  Namespace.findOne({ 'metadata.name': namespace })
    .then((found) => {
      if (found) {
        return next();
      }
      return res.status(404).send(Namespace.notFoundStatus(namespace, 'Namespace'));
    })
    .catch(next);
});

module.exports = router;
