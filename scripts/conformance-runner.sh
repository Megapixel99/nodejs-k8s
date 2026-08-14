#!/usr/bin/env bash
# Runs each [Conformance] test individually with a hard per-test timeout so a
# single slow/stuck test doesn't block the rest of the suite. Writes a
# pass/fail CSV so we can measure progress quantitatively.
set -u
cd "$(dirname "$0")/.."

BIN="${E2E_BIN:-/tmp/k8s-test-pkg-34/kubernetes/test/bin/e2e.test}"
PER_TEST_TIMEOUT="${PER_TEST_TIMEOUT:-45}"   # seconds
OUT="${OUT:-/tmp/conf-results.csv}"
SKIP_FILE="${SKIP_FILE:-./scripts/conformance-skip.txt}"

# List all [Conformance] test names once.
LIST=$(mktemp)
"$BIN" -ginkgo.dry-run -ginkgo.v -ginkgo.focus='\[Conformance\]' --ginkgo.no-color 2>&1 \
  | grep -E '\[Conformance\]' \
  | sed -E 's/^[[:space:]]+//;s/[[:space:]]+\[[a-z,-]+(, Conformance)?(, [a-zA-Z]+)*\][[:space:]]*$//' \
  | grep -v '^$' \
  | sort -u > "$LIST"

total=$(wc -l < "$LIST" | tr -d ' ')
echo "Found $total conformance tests"
echo "test,result,duration_s" > "$OUT"

idx=0
while IFS= read -r name; do
  idx=$((idx+1))
  # Skip tests we know fail for infra reasons.
  if [[ -f "$SKIP_FILE" ]] && grep -qFx "$name" "$SKIP_FILE" 2>/dev/null; then
    echo "skip,,0" >> "$OUT.tmp" && printf '[%4d/%4d] SKIP  %s\n' "$idx" "$total" "$name"
    continue
  fi
  # Escape ginkgo regex special chars.
  esc=$(printf '%s' "$name" | sed 's/[][(){}.+*?^$|\\]/\\&/g')
  start=$(date +%s)
  out=$(mktemp)
  timeout "$PER_TEST_TIMEOUT" "$BIN" \
    -kubeconfig=./test-config -provider=skeleton \
    -ginkgo.focus="^${esc}$" \
    -ginkgo.timeout="$((PER_TEST_TIMEOUT))s" \
    --ginkgo.no-color > "$out" 2>&1
  rc=$?
  end=$(date +%s)
  dur=$((end-start))
  if [[ $rc -eq 124 ]]; then
    result=TIMEOUT
  elif grep -q 'SUCCESS!' "$out"; then
    result=PASS
  elif grep -q 'FAIL!' "$out"; then
    result=FAIL
  else
    result=UNKNOWN
  fi
  printf '%s,%s,%d\n' "\"$name\"" "$result" "$dur" >> "$OUT"
  printf '[%4d/%4d] %-8s %s\n' "$idx" "$total" "$result" "$name"
  rm -f "$out"
done < "$LIST"

rm -f "$LIST"
echo
echo "Done. Results in $OUT"
awk -F, 'NR>1 {count[$2]++} END {for (k in count) printf "  %-8s %d\n", k, count[k]}' "$OUT"
