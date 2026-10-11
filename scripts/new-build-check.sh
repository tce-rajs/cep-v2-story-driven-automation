#!/usr/bin/env bash
# New-build check (about 30 minutes): checkpoints, Plan Mode and every principal report, in three browser streams at
# once, then one summary page (report/NEW_BUILD_CHECK_<version>.html).
#   1. Checkpoint end to end: the teacher starts a fresh Revision Test, all 30 students take it, the teacher's roster and
#      summary, the principal's report (CHK-13, full class).
#   2. Principal reports: every tab, downloads, filters, Assessment for Learning Baseline and Revision (CHK-05, CHK-08).
#   3. Plan Mode: Question Bank, quiz, Revision Test, Check Point (tests/10-plan-mode).
# Usage: bash scripts/new-build-check.sh ["Revision Test title"] ["question count, e.g. 2 Q'S"]
cd "$(dirname "$0")/.." || exit 1
export RUN_IN_BROWSER=1
TITLE="${1:-AutoTest NB1}"
QUESTIONS="$2"
if [ -z "$QUESTIONS" ]; then QUESTIONS="2 Q'S"; fi
STAMP=$(date +%Y-%m-%d_%H-%M)
OUT="test-results-newbuild/$STAMP"
mkdir -p "$OUT"

VERSION=$(node scripts/server-version.js 2>/dev/null || echo unknown)
echo "Server build: $VERSION  (results in $OUT)"

(
  export FULL_CLASS_KIND=revision FULL_CLASS_TITLE="$TITLE" FULL_CLASS_QUESTIONS="$QUESTIONS"
  export FULL_CLASS_PATTERN=mixed FULL_CLASS_NAME="newbuild-$VERSION" FULL_CLASS_PRINCIPAL_TRIES=4 FULL_CLASS_PARALLEL=8
  PLAYWRIGHT_JSON_OUTPUT_NAME="$OUT/checkpoint.json" npx playwright test tests/21-checkpoints/chk-13-full-class.spec.js \
    --reporter=list,json --output="$OUT/checkpoint" > "$OUT/checkpoint.log" 2>&1
  echo "stream 1 (checkpoint) done"
) &
(
  PLAYWRIGHT_JSON_OUTPUT_NAME="$OUT/reports.json" npx playwright test tests/21-checkpoints/chk-05-principal-report.spec.js \
    tests/21-checkpoints/chk-08-reports.spec.js --reporter=list,json --output="$OUT/reports" > "$OUT/reports.log" 2>&1
  echo "stream 2 (reports) done"
) &
(
  PLAYWRIGHT_JSON_OUTPUT_NAME="$OUT/planmode.json" npx playwright test tests/10-plan-mode \
    --reporter=list,json --output="$OUT/planmode" > "$OUT/planmode.log" 2>&1
  echo "stream 3 (Plan Mode) done"
) &
wait
node scripts/new-build-summary.js "$OUT" "$VERSION" "newbuild-$VERSION"
