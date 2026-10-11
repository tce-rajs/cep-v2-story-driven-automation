#!/usr/bin/env bash
# Runs the case IDs listed in <left.txt> (one --grep pattern per line, from scripts/remaining-tests.js), each line in
# its own desktop client (separate user-data folder), in parallel. Usage: bash scripts/run-remaining-groups.sh <dir> <left.txt>
set -u
cd "$(dirname "$0")/.."
OUT=$1
LEFT=$2
FOLDERS=$(grep '^FOLDERS=' scripts/run-client-shards.sh | cut -d'"' -f2)
EXISTING=""
for f in $FOLDERS; do [ -d "$f" ] && EXISTING="$EXISTING $f"; done
DEEP="@long|@edge|@concurrency|@interruption|@performance"
i=0
pids=""
while IFS= read -r pattern; do
  [ -z "$pattern" ] && continue
  i=$((i + 1))
  dir="C:/Users/v_crystalQA3/AppData/Local/cep-qa-client$((i + 2))"
  CLIENT_USER_DATA_DIR="$dir" PLAYWRIGHT_JSON_OUTPUT_NAME="$OUT/group-$i.json" \
    npx playwright test $EXISTING --grep "$pattern" --grep-invert "$DEEP" \
    --reporter=list,json --output="$OUT/group-$i" > "$OUT/group-$i.log" 2>&1 &
  pids="$pids $!"
  sleep 20
done < "$LEFT"
wait $pids
echo "GROUPS DONE: $OUT"
