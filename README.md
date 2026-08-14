# k8s-sim — a Kubernetes API-compatible sandbox in Node.js

A simulator of the Kubernetes API. Speaks the same HTTP/JSON/protobuf surface
as a real `kube-apiserver`, schedules pods onto a fleet of simulated nodes,
orders its writes through a Raft log behind an etcd-compatible store, keeps
objects in MongoDB, and runs "pods" as sibling Docker containers on the host.

**What it's for.** Learning `kubectl`, testing operators or controllers
against a lightweight fake apiserver, and quick demos without a real cluster
or `kind`/`minikube` boot time. Runs on a laptop in seconds.

**What it is _not_.** A production Kubernetes replacement. See [Scope &
limitations](#scope--limitations) for the honest list of gaps.

## Quick start

Prerequisites: Node.js ≥ 18, Docker Desktop (or a reachable `docker` daemon),
and `kubectl`.

```bash
npm run setup    # installs deps, brings up MongoDB, builds helper images, writes ./kubeconfig
npm start        # API server on http://127.0.0.1:8080
```

In another shell:

```bash
export KUBECONFIG=$PWD/kubeconfig
kubectl get ns
kubectl apply -f examples/hello-world
kubectl get pods -A
```

To stop everything:

```bash
# Ctrl-C the server, then:
docker compose down
docker rm -f $(docker ps -aq --filter "label=k8s-sim") 2>/dev/null || true
```

## How it works

```
┌──────────────┐      HTTP (kube API)      ┌──────────────────────────┐
│   kubectl    │ ─────────────────────────▶│ Express on :8080         │
│  (your CLI)  │                            │  routes/  middleware/    │
└──────────────┘                            │  objects/                │
                                            └───┬──────────────┬───────┘
                                                │              │
                                   Mongoose ▼   │        ▼         ▼ docker CLI
                                     ┌──────────┴┐  ┌──────────┐ ┌─────────────┐
                                     │ Mongo     │  │ store/   │ │ Docker (host│
                                     │ (objects) │  │ MVCC +   │ │ daemon)     │
                                     │           │  │ Raft log │ │ — spawns    │
                                     │           │  │ :2379    │ │   "pods"    │
                                     └───────────┘  └──────────┘ └─────────────┘
                                                          ▲
                                                          │ etcd v3 JSON API
                                                       curl / your tooling
```

- Every API resource has an object class in `objects/`, a Mongoose schema in
  `database/models.js`, and an Express route in `routes/`. The middleware in
  `middleware/general.js` wires up CRUD + watch + table + patch (JSON Patch,
  JSON Merge Patch, and Strategic Merge Patch are all supported).
- `objects/bus.js` is a process-wide event bus that feeds watch streams so
  clients see `ADDED`/`MODIFIED`/`DELETED` events in real time.
- `controllers/nodes.js` creates the simulated fleet at boot; `sim-node-1..N`
  carry capacity, allocatable and the usual topology labels.
- `controllers/scheduler.js` places pods on it: filter (readiness, cordons,
  taints, `nodeSelector`, node affinity, cpu/memory/pod fit) then score
  (least-allocated, plus preferred-affinity weight). It's the only controller
  loop. Other controllers (Deployment → ReplicaSet, Job, DaemonSet, CronJob)
  run inline on create.
- `store/` is the MVCC keyspace and the Raft log that orders writes to it.
  `resourceVersion` is that store's revision, the way a real API server's is
  etcd's. It also serves etcd's v3 JSON API on `:2379`.
- Pods are real Docker containers spawned as siblings on the host Docker
  daemon, named `<generateName>-<containerName>`. Volume mounts for
  ConfigMaps are bind-mounted from `./volumes/<ns>_<name>/`.

### The store

Writes are ordered by a Raft log rather than by whichever database transaction
committed first, and the keyspace underneath has etcd's semantics: a global
revision, reads at a past revision, compaction that refuses stale reads with
code 11 instead of serving the nearest surviving one, leases, and watches that
replay from a revision before going live.

It speaks etcd's v3 JSON API, so you can check it from outside the process:

```bash
curl 127.0.0.1:2379/v3/kv/range \
  -d "{\"key\":\"$(printf '/registry/' | base64)\",\"range_end\":\"$(printf '/registry0' | base64)\"}"
```

Keys and values are base64 and revisions are strings — protobuf's JSON
mapping, which the real gateway follows for a reason: a revision parsed as a
JSON number stops being the revision past 2^53.

Defaults need no configuration; state lives in `.store/`.

| Variable | Default | Meaning |
|---|---|---|
| `STORE` | `on` | `off` falls back to the old database counter for `resourceVersion` |
| `STORE_ID` | `default` | This node's name |
| `STORE_DIR` | `.store/<id>` | Raft log, snapshots and term state |
| `STORE_PEERS` | *(single node)* | `id=address,id=address`, listing every member including this one |
| `RAFT_ADDRESS` | `http://127.0.0.1:2380` | Where peers reach this node |
| `ETCD_ADDRESS` | `http://127.0.0.1:2379` | The etcd v3 endpoint |

## What works

API-level (verified against `kubetest2` Conformance):

- Namespace / ConfigMap / Secret lifecycle (create / get / list / patch /
  update / delete / delete-collection)
- ServiceAccount (auto-created per namespace), `kube-root-ca.crt` ConfigMap
- Pod create with `env`, `envFrom: configMapRef` / `secretRef`, `command`,
  `args`, and ConfigMap `volumeMounts`. Phase transitions
  `Pending → Running → Succeeded/Failed` via `docker wait`.
- Init containers (sequential, wait-for-exit-0)
- Liveness / readiness / startup probes (exec, httpGet, tcpSocket)
- Services with a synthetic ClusterIP (no real routing, see below)
- Watch streams over HTTP with newline-delimited JSON, plus protobuf support
  for clients that negotiate it (`client-go`'s default; `kubectl` asks for JSON)
- Scheduling onto simulated nodes, with the refusals a controller has to
  handle: a pod that fits nowhere stays `Pending` with `PodScheduled=False`
  and a `FailedScheduling` event reading
  `0/3 nodes are available: 1 node(s) had untolerated taint {dedicated:
  batch}, 2 node(s) didn't match Pod's node affinity/selector`
- The binding endpoints (`/bindings` and `pods/{name}/binding`), so an
  out-of-tree scheduler can place a pod itself. A pod naming another
  `schedulerName` is left alone until that scheduler binds it
- `resourceVersion` from the store's Raft-ordered revision: watches resume
  from a version instead of replaying the collection, and a write carrying a
  stale version is rejected with a `Conflict` rather than silently overwriting
- Discovery for every routed kind: `/api`, `/api/v1`, `/apis` and
  `/apis/{group}/{version}`, so `kubectl api-resources` and `kubectl get <kind>`
  resolve without a warm discovery cache
- Label selectors and field selectors on list / delete-collection
- `/status` subresources on Pod and Namespace
- Events auto-emitted on every CRUD for observability
- ~55 resource kinds routed. The "real" ones (Pod, Deployment,
  ReplicationController, Service, Endpoints, ConfigMap, Secret, Node,
  Namespace, Event) have lifecycle behavior; the rest are API stubs —
  they round-trip correctly but don't have a controller.

Smoke test covering all 42 wired resources:

```bash
npm run test:smoke   # requires server + mongo running
```

Protobuf round-trip test — asserts on what a client actually decodes, since a
wrong field name or an unwrapped `Quantity` encodes without erroring:

```bash
npm run test:proto   # encoder checks run offline; wire checks need the server
```

Content-type / verb matrix across every wired resource — JSON, YAML, protobuf
and Table, plus all four patch types, asserting on the decoded response:

```bash
npm run test:wire    # requires server + mongo running
```

resourceVersion semantics — allocation, watch resume and optimistic
concurrency:

```bash
npm run test:rv      # requires server + mongo running
```

The Deployment → ReplicationController → Pod chain, end to end:

```bash
npm run test:workload  # requires server + mongo + docker
```

Pod features the README claims — env from ConfigMaps and Secrets, ConfigMap
volume mounts, logs:

```bash
npm run test:pods      # requires server + mongo + docker
```

Scheduling — placement, every predicate's refusal message, the events and
conditions that report it, and the binding endpoints:

```bash
npm run test:sched     # requires server + mongo
```

The store on its own — MVCC and revision semantics, compare-and-swap,
compaction, watches, lease expiry, crash recovery, and a three-node Raft
cluster that survives losing its leader:

```bash
npm run test:store     # needs neither the server nor mongo
```

The variable-expansion conformance test (`[sig-node] Variable Expansion
allow almost all printable ASCII characters as environment variable names
[Conformance]`) passes end-to-end:

```bash
npm test             # runs the kubetest2 harness; needs kubetest2 + ginkgo
```

## Scope & limitations

This is a **simulator**, not a distribution. The following are intentionally
out of scope and won't ever work here:

| Area | Status |
|---|---|
| Multi-node / HA control plane | Partial. The store that orders writes runs as a Raft cluster and survives losing its leader, but the API server is still one Express process and objects still live in one MongoDB. |
| etcd gRPC | No. The store serves etcd's v3 **JSON** API, so `curl` works and `etcdctl` — which speaks gRPC — does not attach. |
| The store as the object store | Not yet. It hands out `resourceVersion` and is durable and replicated; the ~55 object classes still read and write through Mongoose. |
| Real nodes | No. `sim-node-*` are simulated: they have capacity, labels and taints that scheduling honours, but no kubelet — every pod's container runs on the host's Docker daemon regardless of which node it was placed on. |
| Pod-to-pod networking (CNI) | No. Pods are sibling containers on Docker's default bridge; no overlay, no kube-proxy, no iptables rules. |
| DNS resolution for services | No. Services get a synthetic ClusterIP but it isn't routed. `CoreDNS` isn't deployed. |
| Real storage (CSI, PV provisioning) | No. `PersistentVolume` / `PersistentVolumeClaim` round-trip as API objects only. |
| Admission webhooks (Mutating/Validating) | No. Config objects round-trip; the webhook call chain isn't invoked. |
| CustomResourceDefinitions | No. CRDs aren't implemented — operators depending on them will fail. |
| Aggregation API | Partial. Discovery covers every kind we route, but aggregated API servers aren't proxied and `APIService` objects only round-trip. |
| Protobuf for non-core groups | Partial. `.proto` models are loaded for core/v1, apps/v1, networking.k8s.io/v1, rbac.authorization.k8s.io/v1 and certificates.k8s.io/v1. Other groups (batch, storage.k8s.io, policy, autoscaling, …) negotiate down to JSON rather than failing. |
| RBAC enforcement | No. `Role`/`RoleBinding` etc. round-trip but no authz is applied; every request is effectively `system:admin`. |
| Server-side apply | No. `application/apply-patch+yaml` is accepted but treated as a strategic merge. |
| HorizontalPodAutoscaler | No. No metrics-server, no autoscaling loop. |
| Kubelet internals (GC, image pull policy, evictions, cgroups) | No. `docker run` is the extent of it. |

Tests in the `[Conformance]` suite that rely on any of the above will fail
here no matter how much API-surface work is done.

## Compared to existing tools

| Tool | Purpose | Our niche vs. it |
|---|---|---|
| [`kind`](https://kind.sigs.k8s.io) | Real Kubernetes in Docker | k8s-sim is ~100× lighter and boots in seconds, but isn't a real cluster. |
| [`kwok`](https://kwok.sigs.k8s.io) | Simulates kubelet for ≥10k fake nodes | kwok fakes the kubelet against a real apiserver; k8s-sim is the apiserver, and its pods really run. Complementary. |
| [`envtest`](https://book.kubebuilder.io/reference/envtest.html) | Real `kube-apiserver` + etcd for Go tests | envtest is heavier and Go-only; k8s-sim is a standalone HTTP API usable from any language. |

## Directory layout

```
index.js                  entry point (Express app on :8080 + :6443)
routes/                   one file per resource, wires HTTP verbs to middleware
middleware/
  general.js              find / findOne / save / update / patch / delete / list / watch
  protoBuf.js             en/decode protobuf bodies (Time, Long, Quantity coercions)
  openapi.js              OpenAPI v3 schema validation per resource
objects/                  domain classes; each extends K8Object in object.js
  object.js               base: hash(), find(), create(), patch(), update(), delete(), ...
  pod.js                  real lifecycle (runImage, scheduleProbes, exit watcher)
  bus.js                  process-wide event bus for watch streams
database/
  models.js               Mongoose schemas for every resource
  connection.js           MongoDB bootstrap
controllers/
  scheduler.js            filter/score placement, binding, Scheduled events
  nodes.js                creates the simulated fleet at boot
store/
  mvcc.js                 the keyspace: revisions, history, txn, watch, leases
  raft.js                 election, log replication, apply loop
  wal.js                  durable log, term state and snapshots
  transport.js            peer RPC over HTTP
  gateway.js              etcd's v3 JSON API on :2379
  node.js                 one node: store + raft + transport
functions.js              Docker CLI helpers (spawn-based, shell-safe)
proto/                    Kubernetes .proto files the server loads at boot
openApiSpecs/             OpenAPI v3 schemas
examples/                 sample YAML manifests
test/
  test.js                 integration test via kubetest2 (requires external install)
  boot-clean.js           smoke test, hits POST/GET/DELETE for every resource type
  scheduling.js           placement, refusal messages, binding endpoints
  store.js                MVCC, raft, recovery and the etcd endpoint (no server needed)
scripts/
  setup.sh                one-command setup (npm run setup)
  start.sh                start server with mongo up (npm start)
```

## License

MIT — see `LICENSE.md`.
