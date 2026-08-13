# k8s-sim — a Kubernetes API-compatible sandbox in Node.js

A single-process, single-node simulator of the Kubernetes API. Speaks the
same HTTP/JSON/protobuf surface as a real `kube-apiserver`, stores state in
MongoDB, and runs "pods" as sibling Docker containers on the host.

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
                                    Mongoose ▼  │              │ ▼ docker CLI
                                           ┌────┴────┐     ┌───┴─────────┐
                                           │ Mongo   │     │ Docker (host│
                                           │ (etcd   │     │ daemon)     │
                                           │  stand- │     │ — spawns    │
                                           │  in)    │     │   "pods"    │
                                           └─────────┘     └─────────────┘
```

- Every API resource has an object class in `objects/`, a Mongoose schema in
  `database/models.js`, and an Express route in `routes/`. The middleware in
  `middleware/general.js` wires up CRUD + watch + table + patch (JSON Patch,
  JSON Merge Patch, and Strategic Merge Patch are all supported).
- `objects/bus.js` is a process-wide event bus that feeds watch streams so
  clients see `ADDED`/`MODIFIED`/`DELETED` events in real time.
- `controllers/scheduler.js` assigns `spec.nodeName` to pending pods. It's
  the only controller loop. Other controllers (Deployment → ReplicaSet, Job,
  DaemonSet, CronJob) run inline on create.
- Pods are real Docker containers spawned as siblings on the host Docker
  daemon, named `<generateName>-<containerName>`. Volume mounts for
  ConfigMaps are bind-mounted from `./volumes/<ns>_<name>/`.

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
- `resourceVersion` from a cluster-wide counter: watches resume from a version
  instead of replaying the collection, and a write carrying a stale version is
  rejected with a `Conflict` rather than silently overwriting
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
| Multi-node / HA control plane | No. Single Express process, single MongoDB. |
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
| [`kwok`](https://kwok.sigs.k8s.io) | Simulates kubelet for ≥10k fake nodes | kwok simulates the kubelet side; k8s-sim simulates the apiserver side. Complementary. |
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
  scheduler.js            assigns spec.nodeName to pending Pods
functions.js              Docker CLI helpers (spawn-based, shell-safe)
proto/                    Kubernetes .proto files the server loads at boot
openApiSpecs/             OpenAPI v3 schemas
examples/                 sample YAML manifests
test/
  test.js                 integration test via kubetest2 (requires external install)
  boot-clean.js           smoke test, hits POST/GET/DELETE for every resource type
scripts/
  setup.sh                one-command setup (npm run setup)
  start.sh                start server with mongo up (npm start)
```

## License

MIT — see `LICENSE.md`.
