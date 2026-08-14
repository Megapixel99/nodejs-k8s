const router = require('express').Router();
const Pod = require('../objects/pod.js');
const Status = require('../objects/status.js');
const { bindPod } = require('../controllers/scheduler.js');

// A Binding is not an object. It is an instruction -- "put this pod on that
// node" -- and Kubernetes stores nothing when you POST one: it writes
// spec.nodeName on the pod the binding names and throws the binding away.
//
// Storing them, which is what this used to do, left a keyspace full of
// bindings no client ever asks for, made a second binding fail on name
// uniqueness rather than on the pod already being assigned, and -- the part
// that matters -- let a custom scheduler POST a binding, get a 201, and find
// the pod still Pending. This is the one endpoint an out-of-tree scheduler
// needs, so it now does the write it claims to.
function failure({ reason, code, message, name }) {
  return new Status({
    status: 'Failure',
    reason,
    code,
    message,
    details: { name, kind: 'pod' },
  });
}

function bind(request, response) {
  let binding = request.body || {};
  let namespace = request.params.namespace;
  // /pods/{name}/binding names the pod in the path; /bindings names it in the
  // binding's own metadata, which is why a Binding carries a name at all.
  let podName = request.params.name || binding.metadata?.name;
  let nodeName = binding.target?.name;

  if (!podName || !nodeName) {
    return response.status(422).send(failure({
      reason: 'Invalid',
      code: 422,
      name: podName,
      message: podName
        ? `Binding "${podName}" is invalid: target.name: Required value: a binding must name the node to bind to`
        : 'Binding is invalid: metadata.name: Required value: name or generateName is required',
    }));
  }

  return Pod.findOne({ 'metadata.name': podName, 'metadata.namespace': namespace })
    .then(async (pod) => {
      if (!pod) {
        return response.status(404).send(Pod.notFoundStatus(podName));
      }
      if (pod.spec?.nodeName) {
        // The same conflict a real API server reports, and the reason a
        // scheduler retries rather than assuming it won.
        return response.status(409).send(failure({
          reason: 'Conflict',
          code: 409,
          name: podName,
          message: `Operation cannot be fulfilled on pods/binding "${podName}": pod ${namespace}/${podName} is already assigned to node "${pod.spec.nodeName}"`,
        }));
      }
      let bound = await bindPod(pod, nodeName);
      if (!bound) {
        // Lost the race with another scheduler between the read and the
        // write. Conflict is the honest answer; 201 would be a lie about
        // whose placement won.
        return response.status(409).send(failure({
          reason: 'Conflict',
          code: 409,
          name: podName,
          message: `Operation cannot be fulfilled on pods/binding "${podName}": pod ${namespace}/${podName} was bound by someone else`,
        }));
      }
      // Upstream answers a binding with a Status: there is no stored object to
      // hand back.
      return response.status(201).send(new Status({
        status: 'Success',
        code: 201,
        message: 'Success',
        details: { name: podName, kind: 'binding' },
      }));
    })
    .catch(() => response.status(500).send(Pod.internalServerErrorStatus('Binding', podName)));
}

router.post('/api/v1/namespaces/:namespace/bindings', bind);
router.post('/api/v1/namespaces/:namespace/pods/:name/binding', bind);

module.exports = router;
