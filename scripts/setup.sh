#!/usr/bin/env bash
# One-command setup for the k8s-sim API server.
#
# Checks prerequisites, starts MongoDB via docker compose, installs node
# dependencies, builds the loadbalancer / dns Docker images the simulator
# uses for Services, and generates a ready-to-use kubeconfig.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

err()  { printf '\033[31m[error]\033[0m %s\n' "$*" >&2; }
info() { printf '\033[36m[setup]\033[0m %s\n' "$*"; }
ok()   { printf '\033[32m[ok]\033[0m %s\n' "$*"; }

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "'$1' is required but not installed."
    [[ -n "${2:-}" ]] && err "$2"
    exit 1
  fi
}

info "Checking prerequisites"
need node "install Node.js 20+ from https://nodejs.org"
need docker "install Docker from https://docs.docker.com/engine/install"
need curl

if ! docker info >/dev/null 2>&1; then
  err "Docker daemon is not reachable. Start Docker Desktop / dockerd and retry."
  exit 1
fi

NODE_MAJOR=$(node -e 'console.log(process.versions.node.split(".")[0])')
if (( NODE_MAJOR < 18 )); then
  err "Node.js 18+ required; you have $(node --version)"
  exit 1
fi
ok "prerequisites present"

info "Starting MongoDB via docker compose"
docker compose up -d mongo
# Wait for mongo readiness (docker compose's healthcheck doesn't block `up`).
for i in {1..30}; do
  if docker compose exec -T mongo mongosh --quiet --eval 'db.runCommand({ping:1}).ok' 2>/dev/null | grep -q 1; then
    ok "MongoDB ready"
    break
  fi
  sleep 1
  if [[ $i -eq 30 ]]; then
    err "MongoDB did not become ready"
    exit 1
  fi
done

info "Installing node dependencies"
npm install --silent

info "Building helper Docker images (loadbalancer, dns)"
docker build -q -t loadbalancer -f loadBalancer/Dockerfile . >/dev/null
docker build -q -t dns          -f dns/Dockerfile          . >/dev/null
ok "images built"

info "Generating kubeconfig at ./kubeconfig"
cat > "$ROOT/kubeconfig" <<YAML
apiVersion: v1
kind: Config
clusters:
- name: k8s-sim
  cluster:
    server: http://127.0.0.1:8080
    insecure-skip-tls-verify: true
contexts:
- name: k8s-sim
  context:
    cluster: k8s-sim
    user: admin
users:
- name: admin
  user:
    token: admin
current-context: k8s-sim
YAML
ok "kubeconfig written"

cat <<'EOF'

Setup complete. Next steps:

  1. Start the API server:
       npm start

  2. In another shell, point kubectl at it:
       export KUBECONFIG=$PWD/kubeconfig
       kubectl get ns

  3. Try an example:
       kubectl apply -f examples/hello-world

EOF
