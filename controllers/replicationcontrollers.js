// The ReplicationController controller.
//
// An RC created on its own did nothing at all: `kubectl create -f rc.yaml`
// stored an object with spec.replicas: 2 and no pods ever appeared, forever,
// with status.replicas stuck at 0. Pods only existed because the Deployment
// path explicitly asked its RC to make them -- so the oldest workload API in
// Kubernetes worked only as a Deployment's implementation detail, and anything
// that used an RC directly (which upstream's garbage-collection tests all do)
// waited on replicas that were never coming.
//
// This reconciles the RCs nobody else owns. A Deployment-owned RC is left
// alone: that path already creates and scales its pods, and two controllers
// acting on one object would race to create the same replicas and then race to
// delete them again.
const ReplicationController = require('../objects/replicationController.js');
const Pod = require('../objects/pod.js');
const { busFor } = require('../objects/bus.js');

function ownedByController(rc) {
  return (rc?.metadata?.ownerReferences || []).some((ref) => ref.controller);
}

// Pods this RC made. Matching on ownerReference uid rather than on the
// selector is deliberate: two RCs in a namespace can share a selector, and
// adopting each other's pods would make both of them wrong.
async function ownedPods(rc) {
  let pods = await Pod.find({ 'metadata.namespace': rc.metadata.namespace });
  return pods.filter((pod) => (pod.metadata?.ownerReferences || [])
    .some((ref) => ref.uid === rc.metadata.uid));
}

function isReady(pod) {
  return (pod?.status?.conditions || []).some((c) => c.type === 'Ready' && c.status === 'True');
}

// A pod that has finished doesn't count towards the replica count -- the RC
// owes the cluster N *running* pods, and counting a Succeeded one would leave
// it permanently short.
function isLive(pod) {
  let phase = pod?.status?.phase;
  return phase !== 'Succeeded' && phase !== 'Failed' && !pod?.metadata?.deletionTimestamp;
}

async function reconcile(rc) {
  if (!rc?.metadata?.uid || ownedByController(rc)) {
    return undefined;
  }
  let desired = Number(rc.spec?.replicas ?? 1);
  let pods = await ownedPods(rc);
  let live = pods.filter(isLive);

  if (live.length < desired) {
    await rc.createPods(desired - live.length);
  } else if (live.length > desired) {
    // Newest first, so scaling down doesn't take out the pod that has been
    // serving longest.
    let doomed = live
      .sort((a, b) => `${b.metadata.creationTimestamp}`.localeCompare(`${a.metadata.creationTimestamp}`))
      .slice(0, live.length - desired);
    for (const pod of doomed) {
      await new Pod(pod).delete().catch(() => {});
    }
  }

  // Report what is actually there. status.replicas is what a client polls
  // while waiting for an RC to come up, and an RC that never updates it reads
  // as one that never started.
  let current = (await ownedPods(rc)).filter(isLive);
  let ready = current.filter(isReady);
  return rc.patch({
    $set: {
      'status.replicas': current.length,
      'status.fullyLabeledReplicas': current.length,
      'status.readyReplicas': ready.length,
      'status.availableReplicas': ready.length,
      'status.observedGeneration': Number(rc.metadata?.generation ?? 0),
    },
  }).catch(() => undefined);
}

async function reconcileAll() {
  let controllers = await ReplicationController.find({});
  for (const rc of controllers) {
    await reconcile(rc).catch((err) => console.warn('[replicationcontrollers]', err?.message || err));
  }
}

function start() {
  busFor('ReplicationController').on('created', (rc) => {
    reconcile(rc).catch((err) => console.warn('[replicationcontrollers]', err?.message || err));
  });
  busFor('ReplicationController').on('updated', (rc) => {
    reconcile(rc).catch(() => {});
  });
  // Pods finish and pods are deleted out from under their controller, and
  // neither writes to the RC -- so the replica count is only ever right if
  // something recounts it.
  setInterval(() => reconcileAll().catch(() => {}), 5000);
  reconcileAll().catch(() => {});
}

module.exports = { start, reconcile };
