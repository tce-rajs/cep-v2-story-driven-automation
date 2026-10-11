// Builds the final issue list (HTML to read, Excel to share) from the bug tables in report/SIGNOFF_<build>.html.
// Usage: node scripts/build-issue-list.js v0.0.236
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const build = process.argv[2] || 'v0.0.236';
const dir = path.join(__dirname, '..', 'report');
const html = fs.readFileSync(path.join(dir, `SIGNOFF_${build}.html`), 'utf8');
const section = html.slice(html.indexOf('<h2>Bugs by module</h2>'));
const strip = (t) =>
  t
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

const issues = [];
const questions = [];
let moduleName = '';
for (const m of section.matchAll(/<h3 id="m\d+">([^<]*)<\/h3>|<tr><td>\d+<\/td>([\s\S]*?)<\/tr>/g)) {
  if (m[1]) {
    moduleName = strip(m[1]);
    continue;
  }
  const cells = [...m[2].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => strip(c[1]));
  const [id, severity, what, expected, evidence] = cells;
  const row = { module: moduleName, id, severity, what, expected, evidence };
  if (/^(High|Medium|Low)$/.test(severity)) issues.push(row);
  else questions.push(row);
}
const order = { High: 0, Medium: 1, Low: 2 };
const moduleNo = (m) => Number((m.match(/^\d+/) || ['99'])[0]);
issues.sort((a, b) => moduleNo(a.module) - moduleNo(b.module) || order[a.severity] - order[b.severity]);
issues.forEach((r, i) => (r.no = i + 1));
questions.forEach((r, i) => (r.no = i + 1));
const count = (s) => issues.filter((r) => r.severity === s).length;

// --- Excel ---
const wb = XLSX.utils.book_new();
const sheet = (rows) =>
  XLSX.utils.json_to_sheet(
    rows.map((r) => ({
      No: r.no,
      Module: r.module,
      Severity: r.severity,
      'What happens': r.what,
      Expected: r.expected,
      Test: r.id,
      Evidence: r.evidence,
    }))
  );
const issueSheet = sheet(issues);
issueSheet['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 10 }, { wch: 90 }, { wch: 40 }, { wch: 16 }, { wch: 40 }];
XLSX.utils.book_append_sheet(wb, issueSheet, 'Issues');
const qSheet = sheet(questions);
qSheet['!cols'] = issueSheet['!cols'];
XLSX.utils.book_append_sheet(wb, qSheet, 'To clarify');
XLSX.writeFile(wb, path.join(dir, `FINAL_ISSUE_LIST_${build}.xlsx`));

// --- HTML ---
const esc = (t) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const tag = (s) =>
  `<span class="tag ${{ High: 'bad', Medium: 'warn', Low: 'info' }[s] || ''}">${esc(s)}</span>`;
const table = (rows) => {
  let out = '';
  let current = '';
  for (const r of rows) {
    if (r.module !== current) {
      if (current) out += '</table></div>\n';
      current = r.module;
      out += `<h3>${esc(current)}</h3>\n<div class="wrap"><table><tr><th>#</th><th>Severity</th><th>What happens</th><th>Expected</th><th>Test</th><th>Evidence</th></tr>\n`;
    }
    out += `<tr><td>${r.no}</td><td>${tag(r.severity)}</td><td>${esc(r.what)}</td><td>${esc(r.expected)}</td><td class="id">${esc(r.id)}</td><td class="file">${esc(r.evidence)}</td></tr>\n`;
  }
  return out + (current ? '</table></div>\n' : '');
};
const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Final issue list ${build}</title>
<style>
:root{--bg:#f7f7f5;--card:#fff;--text:#1d1d1f;--muted:#666;--line:#e3e3e0;--bad:#b3261e;--warn:#a15c00;--info:#2457a6;--head:#f0f0ec}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#141414;--card:#1e1e1e;--text:#eee;--muted:#aaa;--line:#333;--bad:#ff7b72;--warn:#e3a33b;--info:#79a6ff;--head:#262626}}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:1100px;margin:0 auto;padding:24px 16px 48px}h1{font-size:24px;margin:0 0 4px}h2{font-size:19px;margin:28px 0 8px}h3{font-size:16px;margin:20px 0 8px}
.sub{color:var(--muted);margin-bottom:14px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px}.card b{display:block;font-size:22px}.card span{color:var(--muted);font-size:13px}
.wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden;font-size:14px}
th,td{text-align:left;padding:7px 9px;border-bottom:1px solid var(--line);vertical-align:top}th{background:var(--head);font-size:12px;color:var(--muted);text-transform:uppercase}
tr:last-child td{border-bottom:0}td.id{white-space:nowrap;font-family:ui-monospace,Consolas,monospace;font-size:12px}.file{color:var(--muted);font-size:12px;font-family:ui-monospace,Consolas,monospace}
.tag{display:inline-block;padding:0 7px;border-radius:99px;font-size:11px;font-weight:700;border:1px solid currentColor;white-space:nowrap}.bad{color:var(--bad)}.warn{color:var(--warn)}.info{color:var(--info)}
</style></head><body><main>
<h1>Final issue list — CEP v2 build ${build}</h1>
<div class="sub">Ultra server (Windows), 172.18.2.85 · Teach Mode (desktop client), Plan Mode, checkpoints, student test site and principal reports (browser) · Improvements agreed with the team are excluded. Screenshots: evidence/issues/.</div>
<div class="cards"><div class="card"><b>${issues.length}</b><span>Issues</span></div><div class="card"><b class="bad">${count('High')}</b><span>High</span></div><div class="card"><b class="warn">${count('Medium')}</b><span>Medium</span></div><div class="card"><b class="info">${count('Low')}</b><span>Low</span></div><div class="card"><b>${questions.length}</b><span>To clarify</span></div></div>
<h2>Issues by module</h2>
${table(issues)}
<h2>To clarify</h2>
${table(questions)}
</main></body></html>
`;
fs.writeFileSync(path.join(dir, `FINAL_ISSUE_LIST_${build}.html`), page);
console.log(`issues ${issues.length} (High ${count('High')}, Medium ${count('Medium')}, Low ${count('Low')}), to clarify ${questions.length}`);
