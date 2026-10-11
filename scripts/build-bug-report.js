// Builds report/bugs/BUG_LIST.html: every bug with its screenshot, to open and verify by hand.
// Part 1 — bugs found by walking the flows (phase 1), screenshots from evidence/issues/.
// Part 2 — automated failures confirmed by a re-run (failed twice), screenshot from the re-run.
// Part 3 — failures from runs not yet re-run (Admin, flows, Plan Mode, Checkpoints), screenshot from that run.
// Images are copied to report/bugs/bug-images/ and linked relatively, so the page opens from the folder.
// node scripts/build-bug-report.js <first-run.json …> -- <rerun.json …> -- <single-run.json …>
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const IMG = path.join(ROOT, 'report', 'bugs', 'bug-images');
fs.mkdirSync(IMG, { recursive: true });
const args = process.argv.slice(2);
const parts = [[]];
for (const a of args) a === '--' ? parts.push([]) : parts[parts.length - 1].push(a);
const [firstFiles = [], rerunFiles = [], singleFiles = []] = parts;

const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let imgCount = 0;
// Older reports point at run folders from before the 10 Oct reorganisation (test-results-core, test-results-<name>):
// look for the file where it lives now (test-results/core, test-results/archive/<name>).
const relocate = (src) => {
  if (!src || fs.existsSync(src)) return src;
  const moved = src
    .replace(/test-results-core([\\/])/, `test-results${path.sep}core$1`)
    .replace(/test-results-([^\\/]+)([\\/])/, `test-results${path.sep}archive${path.sep}$1$2`);
  return fs.existsSync(moved) ? moved : src;
};
const copyImg = (orig) => {
  const src = relocate(orig);
  if (!src || !fs.existsSync(src)) return null;
  const name = `img-${String(++imgCount).padStart(4, '0')}${path.extname(src) || '.png'}`;
  fs.copyFileSync(src, path.join(IMG, name));
  return `bug-images/${name}`;
};

// --- Part 1: phase-1 findings ---
const P1 = [
  ['N4', 'High', 'AI Notices', 'Hindi / Marathi text captured from the board becomes gibberish in the notice; the AI invents the title ("Math Homework")', ['flow16-N4a', 'flow16-N4b']],
  ['N1', 'High', 'AI Notices', 'In Class 9A the notice ticks Nursery B by default, not the current class (known #22, worse)', ['flow16-N1']],
  ['H1', 'High', 'AI Homework', 'Homework blocked in 5 of the teacher\'s 9 classes: "grade or class seems incorrect" (9A Science, 12A CS, 12A Physics, 5A Maths, 10A Sanskrit)', ['flow17-H1']],
  ['S1', 'High', 'Learning Shorts', 'Nothing ever records on this server (http): Record shows 0:00, Stop resets, no video, no message', ['flow18-S1']],
  ['A1', 'High', 'Attendance', 'Attendance listed but the register never opens in 12A Physics, 12A CS, 5A Maths (server HTTP 500, no message)', ['flow19-A1']],
  ['A2', 'High', 'Attendance', '10A Science, 8 Oct: register "submitted and locked" with every student unmarked', ['flow19-A2']],
  ['D6', 'High', 'New teacher', '"Pin is already taken" tells a teacher that a colleague uses that PIN (PIN alone signs in)', ['flow02-D6']],
  ['N5', 'Medium', 'AI Notices', 'Paraphrase / translate / grammar buttons show no icon and do nothing', ['flow16-N5']],
  ['C1', 'Medium', 'Class navigation', 'Chapters listed out of order (12A Physics 1,2,5,3,4,8…; 9A Science 4,3,2,5…)', ['flow04-C1']],
  ['C3', 'Medium', 'Class navigation', 'Test content visible to teachers ("dddd", "Testing - New Topic Added", "Test New Chapter Added")', ['flow04-C3', 'flow04-C1-C3']],
  ['P1', 'Medium', 'Playlist', '10A Political Science 3.1 video stays on a loading spinner, no message', ['flow07-P1']],
  ['N3', 'Low', 'AI Notices', 'With a notice open, the class chooser opens behind the composer', ['flow16-N3']],
  ['D2', 'Low', 'Admin', 'Version History records the expiry change as "Role Added"; resets are not recorded', ['flow23-D2']],
  ['D4', 'Low', 'New teacher', 'After setting a new password the teacher lands on a blank Sign In form (school cleared)', ['flow02-D4']],
];
const evidence = fs.readdirSync(path.join(ROOT, 'evidence', 'issues'));
const p1 = P1.map(([id, sev, area, title, prefixes]) => ({
  id,
  sev,
  area,
  title,
  imgs: evidence.filter((f) => prefixes.some((p) => f.startsWith(p))).map((f) => copyImg(path.join(ROOT, 'evidence', 'issues', f))),
}));

// --- Reports ---
const read = (files) => {
  const out = new Map();
  const walk = (suite, file) => {
    for (const spec of suite.specs || [])
      for (const t of spec.tests || []) {
        const r = (t.results || []).slice(-1)[0];
        if (!r) continue;
        const id = (spec.title.match(/^([A-Z]+-\d\d-\w+)/) || [])[1];
        if (!id) continue;
        // Strip terminal colour codes from Playwright error text.
        // eslint-disable-next-line no-control-regex
        const err = ((r.error && r.error.message) || '').replace(/\x1b\[[0-9;]*m/g, '').split('\n').find((l) => l.trim()) || '';
        const shot = (r.attachments || []).find((a) => a.name === 'screenshot' && a.path);
        out.set(spec.title, { id, title: spec.title, status: r.status, err: err.trim().slice(0, 260), shot: shot && shot.path, file: suite.file || file });
      }
    for (const c of suite.suites || []) walk(c, suite.file || file);
  };
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    const raw = fs.readFileSync(f, 'utf8');
    const start = raw.search(/^\{\s*$/m);
    if (start < 0) continue;
    try {
      for (const s of JSON.parse(raw.slice(start)).suites || []) walk(s, s.file);
    } catch {
      /* report still being written */
    }
  }
  return out;
};
const bad = (s) => s === 'failed' || s === 'timedOut';
const first = read(firstFiles);
const rerun = read(rerunFiles);
const single = read(singleFiles);
const confirmed = [...rerun.values()].filter((r) => bad(r.status) && first.has(r.title) && bad(first.get(r.title).status));
const singleFails = [...single.values()].filter((r) => bad(r.status));
const timeoutRe = /Timeout \d+ms|Test timeout|while running|while setting up/;
const area = (r) => (r.file || '').split(/[\\/]/)[0] || r.id.split('-')[0];

const card = (r, kind) => {
  const img = copyImg(r.shot);
  const to = timeoutRe.test(r.err) ? '<span class="tag to">time-out</span>' : '';
  return `<div class="card" data-area="${esc(area(r))}" data-kind="${kind}"><div class="head"><span class="id">${esc(r.id)}</span>${to}<span class="area">${esc(area(r))}</span></div>
<div class="title">${esc(r.title.replace(/^[A-Z]+-\d\d-\w+:\s*/, ''))}</div><div class="err">${esc(r.err)}</div>
${img ? `<a href="${img}" target="_blank"><img loading="lazy" src="${img}" alt="${esc(r.id)} screenshot"></a>` : '<div class="noimg">no screenshot</div>'}</div>`;
};

const date = new Date().toISOString().slice(0, 16).replace('T', ' ');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>CEP v2 Bug List</title><style>
:root{--bg:#f6f6f4;--card:#fff;--text:#1d1d1f;--muted:#666;--line:#e2e2df;--high:#b3261e;--med:#a15c00;--low:#2457a6;--to:#6b5ca5}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#141414;--card:#1f1f1f;--text:#eee;--muted:#aaa;--line:#333;--high:#ff7b72;--med:#e3a33b;--low:#79a6ff;--to:#b9a8ff}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.45 system-ui,Segoe UI,sans-serif}
header,main{max-width:1400px;margin:0 auto;padding:16px}h1{margin:0 0 4px;font-size:22px}h2{margin:28px 0 8px;font-size:18px}.sub{color:var(--muted)}
.stats{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}.stat{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px 14px}.stat b{font-size:20px;display:block}
.bar{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}.bar input,.bar select{font:inherit;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--text)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:6px}
.head{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.id{font-family:Consolas,monospace;font-weight:700}.area{color:var(--muted);font-size:12px;margin-left:auto}
.title{font-weight:600}.err{font-family:Consolas,monospace;font-size:12px;color:var(--muted);word-break:break-word}
.card img{width:100%;border:1px solid var(--line);border-radius:6px;cursor:zoom-in}.noimg{color:var(--muted);font-size:12px}
.tag{font-size:11px;font-weight:700;padding:1px 7px;border-radius:99px;border:1px solid currentColor}.High{color:var(--high)}.Medium{color:var(--med)}.Low{color:var(--low)}.to{color:var(--to)}
.imgs{display:grid;grid-template-columns:1fr 1fr;gap:6px}
</style></head><body><header><h1>CEP v2 — Bug List</h1>
<div class="sub">Build 0.0.236, Ultra server. Generated ${date}. Click a screenshot to open it full size.</div>
<div class="stats"><div class="stat"><b>${p1.length}</b>found by walking the flows</div><div class="stat"><b>${confirmed.length}</b>automated, failed twice (confirmed)</div><div class="stat"><b>${singleFails.length}</b>automated, failed once (not yet re-run)</div></div>
<div class="bar"><input id="q" type="search" placeholder="Search ID or text…"><select id="a"><option value="">All areas</option></select></div></header><main>
<h2>1. Found by walking the flows (verified by hand)</h2><div class="grid">
${p1.map((b) => `<div class="card" data-area="${esc(b.area)}" data-kind="p1"><div class="head"><span class="id">${b.id}</span><span class="tag ${b.sev}">${b.sev}</span><span class="area">${esc(b.area)}</span></div><div class="title">${esc(b.title)}</div><div class="imgs">${b.imgs.filter(Boolean).map((i) => `<a href="${i}" target="_blank"><img loading="lazy" src="${i}" alt="${b.id}"></a>`).join('')}</div></div>`).join('\n')}
</div>
<h2>2. Automated tests that failed twice (confirmed)</h2><div class="sub">"time-out" = the screen did not respond in time: a real slow or blocked screen, or slowness from parallel test clients — verify by hand.</div><div class="grid">
${confirmed.sort((x, y) => area(x).localeCompare(area(y)) || x.id.localeCompare(y.id)).map((r) => card(r, 'confirmed')).join('\n')}
</div>
<h2>3. Automated tests that failed once (Admin, flows, Plan Mode, Checkpoints — not yet re-run)</h2><div class="grid">
${singleFails.sort((x, y) => area(x).localeCompare(area(y)) || x.id.localeCompare(y.id)).map((r) => card(r, 'single')).join('\n')}
</div></main>
<script>
const cards=[...document.querySelectorAll('.card')];const sel=document.getElementById('a');
[...new Set(cards.map(c=>c.dataset.area))].sort().forEach(a=>{const o=document.createElement('option');o.value=a;o.textContent=a;sel.appendChild(o)});
const f=()=>{const q=document.getElementById('q').value.toLowerCase(),a=sel.value;cards.forEach(c=>{c.style.display=(!a||c.dataset.area===a)&&(!q||c.textContent.toLowerCase().includes(q))?'':'none'})};
document.getElementById('q').addEventListener('input',f);sel.addEventListener('input',f);
</script></body></html>`;
fs.writeFileSync(path.join(ROOT, 'report', 'bugs', 'BUG_LIST.html'), html);
console.log(`report/bugs/BUG_LIST.html: ${p1.length} flow bugs, ${confirmed.length} confirmed, ${singleFails.length} single-run failures, ${imgCount} images`);
