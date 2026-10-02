// Re-runs every bug in report/recheck-ids.txt (written by scripts/build-bug-review.js) on the current server and records,
// per bug, whether it still fails: report/revalidation.json, then rebuilds report/BUG_REVIEW.* with the result column.
// Usage: node scripts/revalidate-bugs.js [build label]     (runs in the desktop client, workers=1, can take hours)
//        node scripts/revalidate-bugs.js --from-json [build label]   re-classify the last run without re-running it
//        node scripts/revalidate-bugs.js --only-inconclusive [label]  re-run only the bugs whose last result was inconclusive
// A failure only counts as "Still fails" when the test reached the feature. Failures in class/chapter navigation, test
// timeouts, set-up hooks or a named environment problem are "Inconclusive" (rerun when nothing else uses the account).
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const fromJson = args.includes('--from-json');
const onlyInconclusive = args.includes('--only-inconclusive');
const label = args.filter((a) => !a.startsWith('--')).join(' ');
const revalPath = path.join(root, 'report', 'revalidation.json');
const previous = fs.existsSync(revalPath) ? JSON.parse(fs.readFileSync(revalPath, 'utf8')) : { results: {} };
const allIds = fs
  .readFileSync(path.join(root, 'report', 'recheck-ids.txt'), 'utf8')
  .split(/\s+/)
  .filter(Boolean);
const ids = onlyInconclusive ? allIds.filter((id) => /^Inconclusive/.test(previous.results[id] || '')) : allIds;
const INCONCLUSIVE =
  /getByRole\('tab'|playlist-select-chapter|playlist-select-topic|playlist-current-grade-subject-btn|Test timeout|"beforeEach" hook|ENVIRONMENT:|Target page, context or browser has been closed/;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const grep = `(${ids.map(esc).join('|')}):`;
const jsonOut = path.join(root, 'test-results', 'revalidation-run.json');
fs.mkdirSync(path.dirname(jsonOut), { recursive: true });

console.log(fromJson ? 'Re-classifying the last run...' : `Re-running ${ids.length} bugs...`);
// Called through node directly (no shell): the ID pattern contains | ( ) that a shell would mangle.
if (!fromJson)
  spawnSync(
    process.execPath,
    [
      require.resolve('@playwright/test/cli'),
      'test',
      'tests',
      '--grep',
      grep,
      '--reporter=list,json,./scripts/result-summary-reporter.js',
    ],
    { cwd: root, stdio: 'inherit', env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: jsonOut } }
  );

// Per bug: a recorded known bug (test.fail) that failed = still fails; that passed = fixed?; a plain test that failed =
// still fails; that passed = fixed?; skipped = not run (reason).
const report = JSON.parse(fs.readFileSync(jsonOut, 'utf8'));
// Keep earlier results for bugs not re-run this time (--only-inconclusive).
const results = onlyInconclusive ? { ...previous.results } : {};
const walk = (suite) => {
  for (const spec of suite.specs || [])
    for (const t of spec.tests || []) {
      const id = (spec.title.match(/^([A-Z]+-\d+[\w-]*):/) || [])[1];
      if (!id || !ids.includes(id)) continue;
      const r = t.results[t.results.length - 1] || {};
      const skip = (t.annotations || []).find((a) => a.type === 'skip' || a.type === 'fixme');
      const error = (r.errors || [])
        .map((e) => String(e.message || ''))
        .join(' ')
        .replace(/\x1b\[[0-9;]*m/g, ''); // eslint-disable-line no-control-regex
      if (r.status === 'skipped') results[id] = `Not run: ${(skip && skip.description) || 'skipped'}`;
      else if (r.status === 'passed') results[id] = 'Passed - fixed?';
      else if (INCONCLUSIVE.test(error)) {
        const why = /ENVIRONMENT:/.test(error)
          ? 'environment (server on plain http)'
          : /Test timeout|beforeEach/.test(error)
            ? 'timed out before reaching the feature'
            : 'could not open the class/chapter';
        results[id] = `Inconclusive: ${why} - rerun`;
      } else results[id] = 'Still fails';
    }
  for (const s of suite.suites || []) walk(s);
};
for (const s of report.suites || []) walk(s);
for (const id of ids) if (!results[id]) results[id] = 'Not run (no matching test)';

const out = { date: new Date().toISOString().slice(0, 10), build: label || previous.build || '', results };
fs.writeFileSync(path.join(root, 'report', 'revalidation.json'), JSON.stringify(out, null, 1));
const tally = {};
for (const v of Object.values(results)) tally[v.split(':')[0]] = (tally[v.split(':')[0]] || 0) + 1;
console.log('Revalidation:', JSON.stringify(tally));
spawnSync('node', [path.join(__dirname, 'build-bug-review.js')], { cwd: root, stdio: 'inherit' });
