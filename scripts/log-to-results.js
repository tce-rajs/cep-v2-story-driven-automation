// Converts a Playwright "list" reporter log (the console output of a run) into a results file in report/runs/, for
// runs whose JSON results were not kept. One entry per test line: ok = passed, x = failed, - = skipped.
//   node scripts/log-to-results.js <run.log> <yyyy-mm-dd_hh-mm-ss> "<account>" "<build>"
const fs = require('fs');
const path = require('path');

const [logFile, stamp, account = '', build = ''] = process.argv.slice(2);
if (!logFile || !stamp) {
  console.error('usage: node scripts/log-to-results.js <run.log> <yyyy-mm-dd_hh-mm-ss> "<account>" "<build>"');
  process.exit(1);
}
// Raw outcome of the test's own checks (a known bug that still fails is 'failed' here; the workbook knows which tests
// are known bugs and words the result accordingly).
const STATUS = { ok: 'passed', x: 'failed', '-': 'skipped' };
const tests = [];
for (const line of fs.readFileSync(logFile, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s+(ok|x|-)\s+\d+\s+\[\w+\] › (\S+?):\d+:\d+ › (.+)$/);
  if (!m) continue;
  // The case ID is at the start of the test title -- the LAST "›" part; group names can start with an ID too.
  const title = m[3].split(' › ').pop();
  const id = title.match(/^([A-Z]+-\d\d-\w+)/);
  if (id) tests.push({ id: id[1], file: m[2].split(path.sep).join('/'), status: STATUS[m[1]] });
}
const out = {
  format: 'cep-results-v1',
  startedAt: stamp,
  build,
  runner: 'desktop client',
  account,
  source: logFile,
  tests,
};
const dest = path.join(__dirname, '..', 'report', 'runs', `run_${stamp}.json`);
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 1));
const counts = {};
for (const t of tests) counts[t.status] = (counts[t.status] || 0) + 1;
console.log(`${tests.length} tests -> ${path.relative(process.cwd(), dest)} ${JSON.stringify(counts)}`);
