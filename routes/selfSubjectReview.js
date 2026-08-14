const router = require('express').Router();
const { DateTime } = require('luxon');
const { SelfSubjectReview } = require('../objects');

// apiVersion is group-qualified (authentication.k8s.io/v1), so this belongs
// under /apis — mounting it at /api produced a path nothing could reach.
const routes = [`/apis/${SelfSubjectReview.apiVersion}/selfsubjectreviews`];

// `kubectl auth whoami` posts one of these and reads the answer. Like a
// Binding, it is a question rather than an object: the API server fills in
// status.userInfo from the request's own credentials and stores nothing.
// Persisting them meant the second one ever submitted collided with the first
// on name, and left rows behind describing a user nobody had asked about.
//
// There is no authentication here -- every request is effectively
// cluster-admin, which the README says plainly -- so the honest answer names
// that user rather than inventing one.
router.post(routes, (request, response) => {
  response.status(201).send({
    apiVersion: SelfSubjectReview.apiVersion,
    kind: SelfSubjectReview.kind,
    metadata: {
      creationTimestamp: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ''),
    },
    status: {
      userInfo: {
        username: 'system:unauthenticated',
        groups: ['system:masters', 'system:authenticated'],
      },
    },
  });
});

module.exports = router;
