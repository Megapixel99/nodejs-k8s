# Kubernetes in Node.js

> A from-scratch reimplementation of Kubernetes' core APIs in pure Node.js — compatible with the real `kubectl` CLI and standard Kubernetes YAML.

[![tests](https://github.com/Megapixel99/nodejs-k8s/actions/workflows/tests.yml/badge.svg)](https://github.com/Megapixel99/nodejs-k8s/actions/workflows/tests.yml)

An attempt to recreate the core functionality of
[Kubernetes v1.29](https://v1-29.docs.kubernetes.io/) in Node.js. It speaks the
same HTTP/JSON/protobuf surface as a real `kube-apiserver`, schedules pods onto
a fleet of simulated nodes, orders its writes through a Raft log behind an
etcd-compatible store, keeps objects in MongoDB, and runs "pods" as sibling
Docker containers on the host.

**Write-up:** [Reimplementing Enough of Kubernetes to Fool
kubectl](https://sethwheeler.dev/blog/fooling-kubectl/) — the surprise was not the
resource schemas, it was that `kubectl` delegates its own output formatting to the
server, and that a Quantity sent as a plain string decodes as zero on the client
rather than erroring.

**What it's for.** Learning `kubectl`, testing operators or controllers
against a lightweight fake apiserver, and quick demos without a real cluster
or `kind`/`minikube` boot time. Runs on a laptop in seconds.

**What it is _not_.** A production Kubernetes replacement. See [Scope &
limitations](#scope--limitations) for the honest list of gaps.

## Quick start

Prerequisites: [Node.js](https://nodejs.org) ≥ 20,
[Docker Engine](https://docs.docker.com/engine/install/) ≥ 25.0.3 (Docker
Desktop, or any reachable `docker` daemon), and
[`kubectl`](https://kubernetes.io/docs/tasks/tools/) — recommended, though the
API is plain HTTP and works from anything.

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

`npm run setup` writes `./kubeconfig`; it isn't checked in, since it is
generated.

`npm run setup` also brings up MongoDB in Docker. To point at your own instance
instead, set `DB_URL` in a `.env` file (see `.env.example`) and skip that part.

The server logs one line per request — method, path, status, duration. When you
need to see what a client actually sent, `DEBUG_BODIES=1 npm start` adds the
headers and both bodies.

To stop everything:

```bash
# Ctrl-C the server, then:
docker compose down
docker rm -f $(docker ps -aq --filter "label=k8s-sim") 2>/dev/null || true
```

## How it works

```
┌──────────────┐      HTTP (kube API)     ┌───────────────────────────┐
│   kubectl    │ ────────────────────────▶│ Express on :8080          │
│  (your CLI)  │                          │  routes/ middleware/      │
└──────────────┘                          │  objects/ controllers/    │
                                          └──┬───────────┬──────────┬─┘
                                             │           │          │
                                    Mongoose │           │          │ docker CLI
                                             ▼           ▼          ▼
                                    ┌───────────┐ ┌──────────┐ ┌─────────────┐
                                    │ Mongo     │ │ store/   │ │ Docker (host│
                                    │ (objects) │ │ MVCC +   │ │ daemon)     │
                                    │           │ │ Raft log │ │ — spawns    │
                                    │           │ │ :2379    │ │   "pods"    │
                                    └───────────┘ └──────────┘ └─────────────┘
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
- `controllers/endpoints.js` keeps each Service's `Endpoints` and
  `EndpointSlice` in step with the pods its selector matches. Level-triggered:
  it recomputes the set rather than patching it incrementally.
- `controllers/scheduler.js` places pods on it: filter (readiness, cordons,
  taints, `nodeSelector`, node affinity, cpu/memory/pod fit) then score
  (least-allocated, plus preferred-affinity weight). It's the only controller
  loop. Other controllers (Deployment → ReplicaSet, Job, DaemonSet, CronJob)
  run inline on create.
- `store/` is the MVCC keyspace and the Raft log that orders writes to it.
  `resourceVersion` is that store's revision, the way a real API server's is
  etcd's. It also serves etcd's v3 JSON API on `:2379`.
- Pods are real Docker containers spawned as siblings on the host Docker
  daemon, named `<generateName>-<containerName>`, with ConfigMap volume mounts
  bind-mounted from `./volumes/<ns>_<name>/`. They start only once the pod is
  bound to a node, so a pod the scheduler refused doesn't quietly run anyway.

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
- Init containers: sequential, each with its own `command`, reported in
  `status.initContainerStatuses` (waiting → running → terminated with an exit
  code), and a non-zero exit fails the pod without starting the main
  containers
- Liveness / readiness / startup probes (exec, httpGet, tcpSocket)
- Services with a synthetic ClusterIP (no real routing, see below), and the
  `Endpoints` behind them: a Service with a selector gets its matching pods,
  split into ready and not-ready addresses, with `targetPort` resolved to the
  container's port. A Service with no selector is left alone for you to fill in
- `EndpointSlice` (`discovery.k8s.io/v1`) alongside them, which is what
  anything written since 1.21 actually reads: per-endpoint `ready` / `serving`
  / `terminating` conditions, the node and zone each address is in, a
  `targetRef` back to the pod, and the `kubernetes.io/service-name` label a
  client selects on. One slice per service — sharding exists for a scale this
  never reaches, and a client can't tell the difference
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

## Tests

Everything, in one command. Suites run in their own processes, and the table is
the whole output unless something fails:

```bash
npm run test:all
```

```
portability ok   0 fails, 500 passes. (0.2s)
store      ok    0 fails, 84 passes. (7.1s)
proto      ok    0 fails, 25 passes. (2.5s)
smoke      ok    0 fails, 0 warns, out of 41 resources tested. (3.9s)
wire       ok    0 fails, out of 41 resources tested. (37.4s)
rv         ok    0 fails, 14 passes. (3.6s)
sched      ok    0 fails, 38 passes. (34.6s)
pods       ok    0 fails, 28 passes. (45.6s)
workload   ok    0 fails, 16 passes. (16.7s)
services   ok    0 fails, 19 passes. (22.3s)

10/10 suites clean, 0 failing assertions.
```

Individually, or a subset (`npm run test:all -- store rv`):

| Suite | Command | Needs | Covers |
|---|---|---|---|
| portability | `npm run test:portability` | nothing | that every relative `require` matches a real file with the exact case — a mismatch loads fine on macOS and throws `MODULE_NOT_FOUND` on Linux |
| store | `npm run test:store` | nothing | MVCC and revision semantics, compare-and-swap, compaction, watches, lease expiry, crash recovery, and a three-node Raft cluster that survives losing its leader |
| proto | `npm run test:proto` | server | protobuf round-trips — a wrong field name or an unwrapped `Quantity` encodes without erroring, so this asserts on what a client decodes |
| smoke | `npm run test:smoke` | server | POST/GET/DELETE for every wired resource |
| wire | `npm run test:wire` | server | JSON, YAML, protobuf and Table across every resource, plus all four patch types |
| rv | `npm run test:rv` | server | `resourceVersion` allocation, watch resume, optimistic concurrency |
| sched | `npm run test:sched` | server | placement, every predicate's refusal message, the events and conditions that report it, and the binding endpoints |
| pods | `npm run test:pods` | server + docker | env from ConfigMaps and Secrets, ConfigMap volume mounts, probes, logs, init containers |
| workload | `npm run test:workload` | server + docker | the Deployment → ReplicationController → Pod chain |
| services | `npm run test:services` | server + docker | Service selectors, and the Endpoints and EndpointSlices behind them |

Assertions are written against what a client ends up with, not against status
codes. Almost every bug these have caught returned 200 with the wrong body.

CI runs the same thing on every push and pull request
(`.github/workflows/tests.yml`): one job for the store and the portability
check, which need neither the server nor a database and answer in seconds, and
one that brings up MongoDB,
starts the API server and runs `npm run test:all` against the runner's own
Docker daemon — the same arrangement as a laptop, so a failure there is a real
failure rather than an artefact of the environment.

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
  endpoints.js            keeps Endpoints and EndpointSlices in step with pods
functions.js              Docker CLI helpers (spawn-based, shell-safe)
proto/                    Kubernetes .proto files the server loads at boot
openApiSpecs/             OpenAPI v3 schemas
examples/                 sample YAML manifests
test/
  test.js                 integration test via kubetest2 (requires external install)
  boot-clean.js           smoke test, hits POST/GET/DELETE for every resource type
  scheduling.js           placement, refusal messages, binding endpoints
  store.js                MVCC, raft, recovery and the etcd endpoint (no server needed)
  services.js             Service selectors, Endpoints and EndpointSlices
  all.js                  runs every suite and prints one table (npm run test:all)
scripts/
  setup.sh                one-command setup (npm run setup)
  start.sh                start server with mongo up (npm start)
```

## Contributing

Open an issue or a PR if something is broken. `npm run test:all` is the fastest
way to find out whether a change holds up — it needs the server and Docker
running for the full set, and nothing at all for `portability` and `store`.

## License

MIT — see `LICENSE.md`.
