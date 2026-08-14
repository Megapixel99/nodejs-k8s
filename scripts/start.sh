#!/usr/bin/env bash
# Start the k8s-sim API server.
#
# Ensures MongoDB is running (brings it up via docker compose if needed) and
# then execs the node server. Requires ./scripts/setup.sh to have been run
# at least once so node_modules and helper images are present.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

if [[ ! -d node_modules ]]; then
  echo "node_modules missing — run ./scripts/setup.sh first" >&2
  exit 1
fi

# Start mongo if it isn't already up.
if ! docker compose ps --format '{{.Name}} {{.State}}' | grep -q 'mongo running'; then
  echo "[start] bringing up MongoDB"
  docker compose up -d mongo
  for i in {1..30}; do
    if docker compose exec -T mongo mongosh --quiet --eval 'db.runCommand({ping:1}).ok' 2>/dev/null | grep -q 1; then
      break
    fi
    sleep 1
  done
fi

# Create the volumes dir we bind-mount into pods.
mkdir -p ./volumes

export DB_URL="${DB_URL:-mongodb://127.0.0.1:27017/k8s}"

echo "[start] API server listening on http://127.0.0.1:8080"
echo "[start] logs: stderr/stdout below (Ctrl-C to stop)"
exec node ./index.js
