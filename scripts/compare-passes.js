// Compares several passes of the same tests: which fail every time, pass every time, or flip (flaky).
// node scripts/compare-passes.js <passA.json,passA2.json…> <passB.json,…> [more passes]  → report/review/PASS_COMPARISON.json
const fs = require('fs');
const path = require('path');

const passes = process.argv.slice(2).map((list) => list.split(','));
const read = (files) => {
  const out = new Map();
  const walk = (suite, file) => {
    for (const spec of suite.specs || [])
      for (const t of spec.tests || []) {
        const r = (t.results || []).slice(-1)[0];
        const status = r ? r.status : 'notrun';
        const err = r && r.error ? (r.error.message || '').replace(/\x1b\[[0-9;]*m/g, '').split('\n').find((l) => l.trim()) || '' : ''; // eslint-disable-line no-control-regex
        out.set(spec.title, { status, err: err.trim().slice(0, 200), file: suite.file || file });
      }
    for (const c of suite.suites || []) walk(c, suite.file || file);
  };
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    const raw = fs.readFileSync(f, 'utf8');
    const start = raw.search(/^\{\s*$/m);
    if (start >= 0) for (const s of JSON.parse(raw.slice(start)).suites || []) walk(s, s.file);
  }
  return out;
};
const maps = passes.map(read);
const titles = new Set(maps.flatMap((m) => [...m.keys()]));
const bad = (s) => s === 'failed' || s === 'timedOut';
const rows = [];
for (const title of titles) {
  const st = maps.map((m) => (m.get(title) || { status: 'absent' }).status);
  const ran = st.filter((s) => s === 'passed' || bad(s));
  const kind =
    ran.length === 0 ? 'not-run' : ran.every(bad) ? 'fail-always' : ran.every((s) => s === 'passed') ? 'pass-always' : 'flaky';
  const last = maps.map((m) => m.get(title)).filter(Boolean).slice(-1)[0] || {};
  rows.push({ title, kind, statuses: st.join(' / '), err: last.err, file: last.file });
}
const count = rows.reduce((a, r) => ((a[r.kind] = (a[r.kind] || 0) + 1), a), {});
const out = path.join(__dirname, '..', 'report', 'review', 'PASS_COMPARISON.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ count, rows }, null, 2));
console.log(count);
