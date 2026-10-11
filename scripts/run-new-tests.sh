#!/usr/bin/env bash
# One pass of the tests written on 9–10 Oct (end-to-end flows, resilience, desktop client, cross-cutting, Teach↔Plan
# round trips on three desktop clients; Admin and Plan Mode in the browser), to compare results across passes.
# Usage: bash scripts/run-new-tests.sh <pass-number>   → test-results/new-tests/pass-<n>/
set -u
cd "$(dirname "$0")/.."
N=${1:-1}
OUT="test-results/new-tests/pass-$N"
mkdir -p "$OUT"
DEEP="@long|@edge|@concurrency|@interruption|@performance"
CLIENT="tests/00-flows tests/18-resilience tests/19-desktop-client tests/20-cross-cutting tests/07-class-navigation/nav-teach-plan-roundtrip.spec.js"
pids=""
for s in 1 2 3; do
  dir=""
  [ "$s" != 1 ] && dir="C:/Users/v_crystalQA3/AppData/Local/cep-qa-client$s"
  CLIENT_USER_DATA_DIR="$dir" PLAYWRIGHT_JSON_OUTPUT_NAME="$OUT/client-$s.json" \
    npx playwright test $CLIENT --grep-invert "$DEEP" --shard="$s/3" --reporter=list,json --output="$OUT/client-$s" \
    > "$OUT/client-$s.log" 2>&1 &
  pids="$pids $!"
  sleep 20
done
RUN_IN_BROWSER=1 PLAYWRIGHT_JSON_OUTPUT_NAME="$OUT/admin.json" \
  npx playwright test tests/22-admin --workers=2 --grep-invert "$DEEP" --reporter=list,json --output="$OUT/admin" \
  > "$OUT/admin.log" 2>&1 &
pids="$pids $!"
RUN_IN_BROWSER=1 PLAYWRIGHT_JSON_OUTPUT_NAME="$OUT/plan.json" \
  npx playwright test tests/10-plan-mode --workers=1 --grep-invert "$DEEP" --reporter=list,json --output="$OUT/plan" \
  > "$OUT/plan.log" 2>&1 &
pids="$pids $!"
wait $pids
echo "PASS $N DONE: $OUT"
