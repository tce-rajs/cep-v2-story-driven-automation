// Review page of the changes made to the story files against a saved copy: new cases, relabelled cases, cases
// marked as improvements and other edits, grouped by module. Writes report/STORY_CHANGES.html.
// Usage: node scripts/story-changes.js <folder with the earlier copy of CEPV2_Stories>
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const before = process.argv[2];
const NOW = path.join(ROOT, 'CEPV2_Stories');
const casesOf = (dir, file) => {
  const map = new Map();
  if (!fs.existsSync(path.join(dir, file))) return map;
  for (const m of fs.readFileSync(path.join(dir, file), 'utf8').matchAll(/^\d+\.\s+([A-Z]+-\d\d-\w+)\s+—\s+(.*)$/gm))
    map.set(m[1], m[2].trim());
  return map;
};
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');

let body = '';
const totals = { New: 0, 'Labelled negative': 0, 'Marked improvement': 0, Changed: 0 };
for (const file of fs.readdirSync(NOW).filter((f) => /^\d\d_.+\.md$/.test(f))) {
  const was = casesOf(before, file);
  const now = casesOf(NOW, file);
  const rows = [];
  for (const [id, text] of now) {
    const old = was.get(id);
    let kind = null;
    if (old === undefined) kind = 'New';
    else if (old !== text) {
      if (/_\(improvement/i.test(text) && !/_\(improvement/i.test(old)) kind = 'Marked improvement';
      else if (/^Negative:/.test(text) && !/^Negative:/.test(old)) kind = 'Labelled negative';
      else kind = 'Changed';
    }
    if (!kind) continue;
    totals[kind]++;
    rows.push(`<tr><td class="id">${esc(id)}</td><td><span class="tag">${kind}</span></td><td>${esc(text)}</td></tr>`);
  }
  if (rows.length)
    body += `<h2>${esc(file.replace('.md', '').replace('_', ' '))} <span class="sub">(${rows.length})</span></h2><div class="wrap"><table><tr><th>Case</th><th>Change</th><th>Test case</th></tr>${rows.join('')}</table></div>`;
}
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Story changes for review</title><style>
:root{--bg:#f7f7f5;--card:#fff;--text:#1d1d1f;--muted:#666;--line:#e3e3e0;--accent:#2457a6;--head:#f0f0ec}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#141414;--card:#1e1e1e;--text:#eee;--muted:#aaa;--line:#333;--accent:#79a6ff;--head:#262626}}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:1000px;margin:0 auto;padding:24px 16px 48px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:17px;margin:24px 0 8px}.sub{color:var(--muted);font-weight:400}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:14px}.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px}.card b{display:block;font-size:22px}.card span{color:var(--muted);font-size:13px}
.wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);font-size:14px}th,td{text-align:left;padding:6px 9px;border-bottom:1px solid var(--line);vertical-align:top}th{background:var(--head);font-size:12px;color:var(--muted);text-transform:uppercase}
td.id{white-space:nowrap;font-family:ui-monospace,Consolas,monospace;font-size:12px}.tag{display:inline-block;padding:0 7px;border-radius:99px;font-size:11px;font-weight:700;border:1px solid var(--accent);color:var(--accent);white-space:nowrap}
</style></head><body><main>
<h1>Story changes for review</h1>
<div class="sub">CEP v2 stable core suite, step 1 — what changed in the user stories and test cases</div>
<div class="cards">${Object.entries(totals)
  .map(([k, v]) => `<div class="card"><b>${v}</b><span>${esc(k)}</span></div>`)
  .join('')}</div>
${body}
</main></body></html>`;
fs.writeFileSync(path.join(ROOT, 'report', 'stories', 'STORY_CHANGES.html'), page);
console.log(
  Object.entries(totals)
    .map(([k, v]) => `${k} ${v}`)
    .join(', ')
);
