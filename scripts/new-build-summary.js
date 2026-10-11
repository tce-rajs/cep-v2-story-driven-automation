// Summary page for scripts/new-build-check.sh: reads the three streams' JSON results and writes
// report/NEW_BUILD_CHECK_<version>.html. A failure whose test ID is already in the sign-off issue list is marked
// "known bug"; any other failure is marked "NEW on this build".
// Usage: node scripts/new-build-summary.js <results folder> <version> <full-class report name>
const fs = require('fs');
const path = require('path');

const [dir, version = 'unknown', fullClassName = ''] = process.argv.slice(2);
const ROOT = path.join(__dirname, '..');
const STREAMS = [
  ['checkpoint', 'Checkpoint end to end (teacher, 30 students, principal)'],
  ['reports', 'Principal reports (every tab, downloads, Assessment for Learning)'],
  ['planmode', 'Plan Mode (Question Bank, quiz, Revision Test, Check Point)'],
];

// Test IDs already in the issue list (any ID mentioned in the bug tables).
const signoff = fs.readFileSync(path.join(ROOT, 'report', 'SIGNOFF_v0.0.236.html'), 'utf8');
const bugSection = signoff.slice(signoff.indexOf('<h2>Bugs by module</h2>'));
const knownIds = new Set();
for (const m of bugSection.matchAll(/<td class="id">([^<]*)<\/td>/g)) {
  for (const id of m[1].matchAll(/([A-Z]+-\d\d)-?(\d\d)?((?:\/\d\d)*)/g)) {
    if (id[2]) knownIds.add(`${id[1]}-${id[2]}`);
    for (const extra of (id[3] || '').split('/').filter(Boolean)) knownIds.add(`${id[1]}-${extra}`);
  }
  for (const short of m[1].matchAll(/(?:,\s*)(\d\d)-(\d\d)/g)) knownIds.add(`CHK-${short[1]}-${short[2]}`);
}

const collect = (suite, out = []) => {
  for (const spec of suite.specs || []) {
    for (const t of spec.tests || []) {
      const last = t.results[t.results.length - 1] || {};
      const status =
        t.status === 'skipped' ? 'skipped' : last.status === 'passed' ? 'passed' : last.status || 'not run';
      const error = (last.error && (last.error.message || '').split('\n')[0]) || '';
      const id = (spec.title.match(/^([A-Z]+-\d\d-\d+)/) || [])[1] || '';
      // Strip the terminal colour codes Playwright puts in error text.
      const plain = error.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g'), '');
      out.push({ id, title: spec.title, status, error: plain });
    }
  }
  for (const s of suite.suites || []) collect(s, out);
  return out;
};

const esc = (t) =>
  String(t ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;');
let html = '';
const totals = { passed: 0, failed: 0, skipped: 0, newFailures: 0, unreachable: 0 };
for (const [key, label] of STREAMS) {
  const file = path.join(dir, `${key}.json`);
  if (!fs.existsSync(file)) {
    html += `<h2>${esc(label)}</h2><p class="bad">No results (the stream did not finish).</p>`;
    continue;
  }
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rows = (report.suites || []).flatMap((s) => collect(s));
  html += `<h2>${esc(label)}</h2><div class="wrap"><table><tr><th>Test</th><th>Result</th><th>Known?</th><th>Detail</th></tr>`;
  for (const r of rows) {
    const failed = r.status !== 'passed' && r.status !== 'skipped';
    const known = failed && r.id && knownIds.has(r.id);
    // The server not answering is an environment problem, not an app result: rerun those tests.
    const unreachable = failed && /ERR_CONNECTION|ERR_NAME|ERR_ADDRESS|ECONNREFUSED|net::ERR_/i.test(r.error);
    if (r.status === 'passed') totals.passed++;
    else if (r.status === 'skipped') totals.skipped++;
    else if (unreachable) totals.unreachable++;
    else {
      totals.failed++;
      if (!known) totals.newFailures++;
    }
    const tag =
      r.status === 'passed'
        ? '<span class="ok">Pass</span>'
        : r.status === 'skipped'
          ? 'Skipped'
          : unreachable
            ? 'Not run'
            : '<span class="bad">Fail</span>';
    const knownTag = !failed
      ? ''
      : unreachable
        ? 'Server not reachable — rerun'
        : known
          ? 'Known bug'
          : '<b class="bad">NEW on this build</b>';
    html += `<tr><td>${esc(r.title)}</td><td>${tag}</td><td>${knownTag}</td><td class="detail">${esc(r.error)}</td></tr>`;
  }
  html += '</table></div>';
}

const fullClass = fullClassName && `FULL_CLASS_TEST_${fullClassName}.html`;
const fullClassLink =
  fullClass && fs.existsSync(path.join(ROOT, 'report', fullClass))
    ? `<p>Per-student comparison (student screen, teacher, principal): <a href="${esc(fullClass)}">${esc(fullClass)}</a></p>`
    : '';
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>New build check ${esc(version)}</title><style>
:root{--bg:#f7f7f5;--card:#fff;--text:#1d1d1f;--muted:#666;--line:#e3e3e0;--ok:#1f7a3a;--bad:#b3261e;--head:#f0f0ec}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#141414;--card:#1e1e1e;--text:#eee;--muted:#aaa;--line:#333;--ok:#5cc27a;--bad:#ff7b72;--head:#262626}}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:1100px;margin:0 auto;padding:24px 16px 48px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:26px 0 8px}.sub{color:var(--muted)}a{color:inherit}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:14px}.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px}.card b{display:block;font-size:22px}.card span{color:var(--muted);font-size:13px}
.wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);font-size:14px}th,td{text-align:left;padding:6px 9px;border-bottom:1px solid var(--line);vertical-align:top}th{background:var(--head);font-size:12px;color:var(--muted);text-transform:uppercase}
.ok{color:var(--ok);font-weight:600}.bad{color:var(--bad);font-weight:600}.detail{color:var(--muted);font-size:12px;max-width:380px}
</style></head><body><main>
<h1>New build check — Teach ${esc(version)}</h1>
<div class="sub">Ultra server 172.18.2.85 · checkpoints, Plan Mode and principal reports · ${new Date().toLocaleString('en-IN')}</div>
<div class="cards"><div class="card"><b class="ok">${totals.passed}</b><span>Passed</span></div><div class="card"><b class="bad">${totals.failed}</b><span>Failed</span></div><div class="card"><b class="bad">${totals.newFailures}</b><span>New on this build</span></div><div class="card"><b>${totals.unreachable}</b><span>Server not reachable (rerun)</span></div><div class="card"><b>${totals.skipped}</b><span>Skipped</span></div></div>
${fullClassLink}
${html}
</main></body></html>`;
const outFile = path.join(ROOT, 'report', `NEW_BUILD_CHECK_${version}.html`);
fs.writeFileSync(outFile, page);
console.log(
  `${outFile}: passed ${totals.passed}, failed ${totals.failed} (new ${totals.newFailures}), server not reachable ${totals.unreachable}, skipped ${totals.skipped}`
);
