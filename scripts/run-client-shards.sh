#!/usr/bin/env bash
# Full client core run split across two desktop clients (each with its own user-data folder), to halve the time.
# Usage: bash scripts/run-client-shards.sh   → results in test-results/core/client-<stamp>/shard-{1,2}.json
set -u
cd "$(dirname "$0")/.."
STAMP=$(date +%Y-%m-%d-%H-%M)
OUT="test-results/core/client-$STAMP"
mkdir -p "$OUT"
echo "$OUT" > test-results/core/client-latest.txt
FOLDERS="tests/01-without-login tests/03-login tests/04-header tests/05-toolbar tests/06-whiteboard tests/07-class-navigation tests/08-playlist tests/09-resources tests/11-players tests/12-minimap tests/13-ai-notices tests/14-learning-shorts tests/15-ai-homework tests/16-attendance tests/17-profile tests/18-resilience tests/19-desktop-client tests/20-cross-cutting tests/00-flows"
EXISTING=""
for f in $FOLDERS; do [ -d "$f" ] && EXISTING="$EXISTING $f"; done
CORE="@smoke|@functional|@negative|@regression"
DEEP="@long|@edge|@concurrency|@interruption|@performance"
run_shard() {
  local n=$1 dir=$2
  CLIENT_USER_DATA_DIR="$dir" PLAYWRIGHT_JSON_OUTPUT_NAME="$OUT/shard-$n.json" \
    npx playwright test $EXISTING --grep "$CORE" --grep-invert "$DEEP" --shard="$n/2" \
    --reporter=list,json --output="$OUT/shard-$n" > "$OUT/shard-$n.log" 2>&1
}
run_shard 1 "" &
P1=$!
sleep 20
run_shard 2 "C:/Users/v_crystalQA3/AppData/Local/cep-qa-client2" &
P2=$!
wait $P1 $P2
echo "CLIENT SHARDS DONE: $OUT"
