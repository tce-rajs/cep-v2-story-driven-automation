#!/usr/bin/env bash
# Complete CEP v2 run: every module and end-to-end flow (deep cases @long/@edge/@concurrency/@interruption/@performance
# left out, as in every pass), then one report.
#   Desktop client: three clients in parallel (own user-data folders), all Teach modules + flows + resilience +
#                   desktop client + cross-cutting.
#   Browser:        Plan Mode + Checkpoints (1 worker), Admin (2 workers).
# Module 02 (new user) is left out: it needs a fresh AutoQA teacher. tests/99-journeys is not part of normal runs.
# Usage: bash scripts/run-full.sh   → test-results/full/<stamp>/ and report/runs/FULL_RUN_<stamp>.md
set -u
cd "$(dirname "$0")/.."
STAMP=$(date +%Y-%m-%d_%H-%M)
OUT="test-results/full/$STAMP"
mkdir -p "$OUT"
echo "$OUT" > test-results/full/latest.txt
DEEP="@long|@edge|@concurrency|@interruption|@performance"
FOLDERS="tests/00-flows tests/01-without-login tests/03-login tests/04-header tests/05-toolbar tests/06-whiteboard tests/07-class-navigation tests/08-playlist tests/09-resources tests/11-players tests/12-minimap tests/13-ai-notices tests/14-learning-shorts tests/15-ai-homework tests/16-attendance tests/17-profile tests/18-resilience tests/19-desktop-client tests/20-cross-cutting"
CLIENT=""
for f in $FOLDERS; do [ -d "$f" ] && CLIENT="$CLIENT $f"; done
echo "Full run started $(date) → $OUT"
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
RUN_IN_BROWSER=1 PLAYWRIGHT_JSON_OUTPUT_NAME="$OUT/plan-checkpoints.json" \
  npx playwright test tests/10-plan-mode tests/21-checkpoints --workers=1 --grep-invert "$DEEP" --reporter=list,json \
  --output="$OUT/plan-checkpoints" > "$OUT/plan-checkpoints.log" 2>&1 &
pids="$pids $!"
RUN_IN_BROWSER=1 PLAYWRIGHT_JSON_OUTPUT_NAME="$OUT/admin.json" \
  npx playwright test tests/22-admin --workers=2 --grep-invert "$DEEP" --reporter=list,json --output="$OUT/admin" \
  > "$OUT/admin.log" 2>&1 &
pids="$pids $!"
wait $pids
echo "Full run finished $(date)"
node scripts/full-run-report.js "$OUT"
