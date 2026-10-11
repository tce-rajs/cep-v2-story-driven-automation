// Final issue list for a new deployment: the sign-off issue list with, for each issue, what the new build's runs
// showed — still present (its test failed again), passed on this build (check whether it is fixed), or not retested.
// New failures seen only on this build (from the new-build summary) are listed on top.
// Usage: node scripts/build-issue-list-for-build.js <build label> <results JSON files...>
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const [build, ...jsonFiles] = process.argv.slice(2);
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'report', 'SIGNOFF_v0.0.236.html'), 'utf8');
const section = html.slice(html.indexOf('<h2>Bugs by module</h2>'));
const strip = (t) =>
  t
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

// Results of this build's runs, by test ID: 'passed' or 'failed' (failures where the server did not answer are left out).
const results = new Map();
const walk = (suite) => {
  for (const spec of suite.specs || []) {
    const id = (spec.title.match(/^([A-Z]+-\d\d-\d+)/) || [])[1];
    if (!id) continue;
    for (const t of spec.tests || []) {
      const last = t.results[t.results.length - 1] || {};
      const msg = (last.error && last.error.message) || '';
      if (/net::ERR_|ECONNREFUSED/.test(msg)) continue;
      const status = last.status === 'passed' ? 'passed' : t.status === 'skipped' ? null : 'failed';
      if (status && results.get(id) !== 'failed') results.set(id, status);
    }
  }
  (suite.suites || []).forEach(walk);
};
for (const f of jsonFiles) {
  if (!fs.existsSync(f)) continue;
  if (f.endsWith('.json')) {
    (JSON.parse(fs.readFileSync(f, 'utf8')).suites || []).forEach(walk);
    continue;
  }
  // A list-reporter log of a run still going: "  ok 3 [client] › … › ID: title" / "  x  4 [client] › …".
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s+(ok|x)\s+\d+\s.*›\s([A-Z]+-\d\d-\d+):/);
    if (!m) continue;
    const status = m[1] === 'ok' ? 'passed' : 'failed';
    if (results.get(m[2]) !== 'failed') results.set(m[2], status);
  }
}

const idsOf = (cell) => {
  const ids = [];
  for (const m of cell.matchAll(/([A-Z]+)-(\d\d)-(\d\d)((?:\/\d\d)*)/g)) {
    ids.push(`${m[1]}-${m[2]}-${m[3]}`);
    for (const extra of (m[4] || '').split('/').filter(Boolean)) ids.push(`${m[1]}-${m[2]}-${extra}`);
  }
  for (const m of cell.matchAll(/,\s*(\d\d)-(\d\d)/g)) ids.push(`CHK-${m[1]}-${m[2]}`);
  return ids;
};

const issues = [];
let moduleName = '';
for (const m of section.matchAll(/<h3 id="m\d+">([^<]*)<\/h3>|<tr><td>\d+<\/td>([\s\S]*?)<\/tr>/g)) {
  if (m[1]) {
    moduleName = strip(m[1]);
    continue;
  }
  const cells = [...m[2].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => strip(c[1]));
  const [id, severity, what, expected, evidence] = cells;
  if (!/^(High|Medium|Low)$/.test(severity)) continue;
  const seen = idsOf(id).map((x) => results.get(x)).filter(Boolean);
  const status = seen.includes('failed')
    ? 'Still present on this build'
    : seen.includes('passed')
      ? 'Passed on this build — check if fixed'
      : 'Not retested in this window';
  issues.push({ module: moduleName, id, severity, what, expected, evidence, status });
}
const order = { High: 0, Medium: 1, Low: 2 };
const moduleNo = (x) => Number((x.match(/^\d+/) || ['99'])[0]);
issues.sort((a, b) => moduleNo(a.module) - moduleNo(b.module) || order[a.severity] - order[b.severity]);
issues.forEach((r, i) => (r.no = i + 1));
const count = (k, v) => issues.filter((r) => r[k] === v).length;

const wb = XLSX.utils.book_new();
const sheet = XLSX.utils.json_to_sheet(
  issues.map((r) => ({
    No: r.no,
    Module: r.module,
    Severity: r.severity,
    [`On build ${build}`]: r.status,
    'What happens': r.what,
    Expected: r.expected,
    Test: r.id,
    Evidence: r.evidence,
  }))
);
sheet['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 10 }, { wch: 30 }, { wch: 90 }, { wch: 40 }, { wch: 16 }, { wch: 40 }];
XLSX.utils.book_append_sheet(wb, sheet, 'Issues');
XLSX.writeFile(wb, path.join(ROOT, 'report', `FINAL_ISSUE_LIST_${build}.xlsx`));

const esc = (t) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const tag = (s) => `<span class="tag ${{ High: 'bad', Medium: 'warn', Low: 'info' }[s] || ''}">${esc(s)}</span>`;
const st = (s) =>
  `<span class="${/Still/.test(s) ? 'bad' : /Passed/.test(s) ? 'ok' : 'muted'}">${esc(s)}</span>`;
let body = '';
let current = '';
for (const r of issues) {
  if (r.module !== current) {
    if (current) body += '</table></div>\n';
    current = r.module;
    body += `<h3>${esc(current)}</h3>\n<div class="wrap"><table><tr><th>#</th><th>Severity</th><th>On this build</th><th>What happens</th><th>Expected</th><th>Test</th><th>Evidence</th></tr>\n`;
  }
  body += `<tr><td>${r.no}</td><td>${tag(r.severity)}</td><td>${st(r.status)}</td><td>${esc(r.what)}</td><td>${esc(r.expected)}</td><td class="id">${esc(r.id)}</td><td class="file">${esc(r.evidence)}</td></tr>\n`;
}
body += current ? '</table></div>\n' : '';
const extra = fs.existsSync(path.join(ROOT, 'report', `NEW_BUILD_EXTRA_${build}.html`))
  ? fs.readFileSync(path.join(ROOT, 'report', `NEW_BUILD_EXTRA_${build}.html`), 'utf8')
  : '';
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Issue list ${esc(build)}</title><style>
:root{--bg:#f7f7f5;--card:#fff;--text:#1d1d1f;--muted:#666;--line:#e3e3e0;--ok:#1f7a3a;--bad:#b3261e;--warn:#a15c00;--info:#2457a6;--head:#f0f0ec}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#141414;--card:#1e1e1e;--text:#eee;--muted:#aaa;--line:#333;--ok:#5cc27a;--bad:#ff7b72;--warn:#e3a33b;--info:#79a6ff;--head:#262626}}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:1150px;margin:0 auto;padding:24px 16px 48px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:19px;margin:28px 0 8px}h3{font-size:16px;margin:20px 0 8px}.sub,.muted{color:var(--muted)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:14px}.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px}.card b{display:block;font-size:22px}.card span{color:var(--muted);font-size:13px}
.wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);font-size:14px}th,td{text-align:left;padding:7px 9px;border-bottom:1px solid var(--line);vertical-align:top}th{background:var(--head);font-size:12px;color:var(--muted);text-transform:uppercase}
td.id{white-space:nowrap;font-family:ui-monospace,Consolas,monospace;font-size:12px}.file{color:var(--muted);font-size:12px;font-family:ui-monospace,Consolas,monospace}
.tag{display:inline-block;padding:0 7px;border-radius:99px;font-size:11px;font-weight:700;border:1px solid currentColor;white-space:nowrap}.bad{color:var(--bad);font-weight:600}.ok{color:var(--ok);font-weight:600}.warn{color:var(--warn)}.info{color:var(--info)}
</style></head><body><main>
<h1>Final issue list — build ${esc(build)}</h1>
<div class="sub">Ultra server 172.18.2.85 · retested on the new deployment (Teach main-${esc(build.split('-')[1] || '')}) · improvements agreed with the team are excluded · screenshots in evidence/issues/</div>
<div class="cards"><div class="card"><b>${issues.length}</b><span>Issues</span></div><div class="card"><b class="bad">${count('severity', 'High')}</b><span>High</span></div><div class="card"><b class="bad">${count('status', 'Still present on this build')}</b><span>Seen again on this build</span></div><div class="card"><b class="ok">${count('status', 'Passed on this build — check if fixed')}</b><span>Passed on this build</span></div><div class="card"><b>${count('status', 'Not retested in this window')}</b><span>Not retested in this window</span></div></div>
${extra}
<h2>Issues by module</h2>
${body}
</main></body></html>`;
fs.writeFileSync(path.join(ROOT, 'report', `FINAL_ISSUE_LIST_${build}.html`), page);
console.log(`issues ${issues.length}: still present ${count('status', 'Still present on this build')}, passed ${count('status', 'Passed on this build — check if fixed')}, not retested ${count('status', 'Not retested in this window')}`);
