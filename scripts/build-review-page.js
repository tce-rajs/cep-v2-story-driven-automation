// Builds report/TEST_CASES_REVIEW.html: every test case from the master workbook in a filterable, Excel-like table,
// with a suggestion box on each row and a "How I use the application" box. Suggestions are kept in the browser and
// exported to a JSON file ("Export suggestions"); `node scripts/merge-review.js <file>` puts them into the workbook's
// Review comments column.
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.join(__dirname, '..');
const rows = XLSX.utils
  .sheet_to_json(XLSX.readFile(path.join(ROOT, 'CEPV2_Stories', 'CEPV2_TestCases.xlsx')).Sheets['CEP v2 Stories'])
  .map((r) => ({
    m: `${r['Module No.']} ${r.Module}`,
    s: `${r['Story ID']} — ${r.Story}`,
    id: r['Test case ID'],
    t: r['Test case'],
    ty: r['Test type'],
    su: r.Suite,
    st: r['Automation status'],
    lr: r['Last run result'] || '',
    rc: r['Review comments'] || '',
  }));

const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>CEP v2 Test Case Review</title>
<style>
:root{--bg:#f7f7f5;--card:#fff;--text:#1d1d1f;--muted:#666;--line:#e3e3e0;--accent:#2457a6;--head:#eef0f3;--ok:#1f7a3a;--bad:#b3261e;--warn:#a15c00;--row:#fafaf8}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#141414;--card:#1e1e1e;--text:#eee;--muted:#aaa;--line:#333;--accent:#79a6ff;--head:#262a30;--ok:#5cc27a;--bad:#ff7b72;--warn:#e3a33b;--row:#1a1a1a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif}
header{padding:18px 16px 8px;max-width:1500px;margin:0 auto}h1{font-size:22px;margin:0 0 2px}.sub{color:var(--muted);font-size:13px}
.panel{max-width:1500px;margin:0 auto;padding:0 16px}
.usage{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px;margin:10px 0}
.usage label{font-weight:600;display:block;margin-bottom:6px}.usage textarea{width:100%;min-height:90px;font:inherit;padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--text)}
.bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0}
.bar input,.bar select{font:inherit;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--text)}
.bar input[type=search]{flex:1;min-width:200px}
button{font:inherit;padding:7px 12px;border:1px solid var(--accent);border-radius:8px;background:var(--accent);color:#fff;cursor:pointer}
button.ghost{background:transparent;color:var(--accent)}
.count{color:var(--muted);font-size:13px}
.wrap{max-width:1500px;margin:0 auto 40px;padding:0 16px;overflow-x:auto}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);font-size:13px}
th{position:sticky;top:0;background:var(--head);text-align:left;padding:7px 8px;border-bottom:1px solid var(--line);font-size:12px;white-space:nowrap;z-index:1}
td{padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}tr:nth-child(even) td{background:var(--row)}
td.id{font-family:ui-monospace,Consolas,monospace;font-size:12px;white-space:nowrap}
td.case{min-width:360px}td.story{min-width:180px;color:var(--muted)}
td.sug textarea{width:240px;min-height:34px;font:inherit;font-size:12px;padding:5px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--text)}
td.sug textarea.has{border-color:var(--accent)}
.pill{display:inline-block;padding:0 7px;border-radius:99px;font-size:11px;font-weight:700;border:1px solid currentColor;white-space:nowrap}
.Core{color:var(--ok)}.Deep{color:var(--warn)}.Improvement,.Out{color:var(--muted)}.Manual{color:var(--accent)}
.Passed{color:var(--ok)}.Failed{color:var(--bad)}
</style></head><body>
<header><h1>CEP v2 — Test Case Review</h1>
<div class="sub">${rows.length} test cases from the master workbook · filter like Excel · type a suggestion on any row · press <b>Export suggestions</b> and send the file</div></header>
<div class="panel">
  <div class="usage"><label for="usage">How I use the application (a typical day, the screens I use most, what matters most to the school)</label>
  <textarea id="usage" placeholder="e.g. I start the day by …"></textarea></div>
  <div class="bar">
    <input type="search" id="q" placeholder="Search test cases, stories, IDs…">
    <select id="fm"><option value="">All modules</option></select>
    <select id="fs"><option value="">All suites</option></select>
    <select id="fst"><option value="">Any automation status</option></select>
    <select id="fty"><option value="">Any test type</option></select>
    <label class="count"><input type="checkbox" id="fsug"> only rows with my suggestions</label>
    <button id="exp">Export suggestions</button><button class="ghost" id="clr">Clear filters</button>
    <span class="count" id="cnt"></span>
  </div>
</div>
<div class="wrap"><table><thead><tr><th>Module</th><th>Story</th><th>Case</th><th>Test case</th><th>Type</th><th>Suite</th><th>Automation</th><th>Last run</th><th>Your suggestion</th></tr></thead><tbody id="tb"></tbody></table></div>
<script>
const ROWS=${JSON.stringify(rows)};
const KEY='cepv2-review-v1';
let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){saved={}}
saved.s=saved.s||{};
const store=()=>{try{localStorage.setItem(KEY,JSON.stringify(saved))}catch(e){}};
const esc=t=>String(t??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const fill=(id,vals)=>{const el=document.getElementById(id);[...new Set(vals)].filter(Boolean).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;el.appendChild(o)})};
fill('fm',ROWS.map(r=>r.m));fill('fs',ROWS.map(r=>r.su));fill('fst',ROWS.map(r=>r.st));fill('fty',ROWS.map(r=>r.ty));
const usage=document.getElementById('usage');usage.value=saved.usage||'';usage.addEventListener('input',()=>{saved.usage=usage.value;store()});
const tb=document.getElementById('tb');
function render(){
  const q=document.getElementById('q').value.toLowerCase(),fm=fmv(),fs=document.getElementById('fs').value,fst=document.getElementById('fst').value,fty=document.getElementById('fty').value,only=document.getElementById('fsug').checked;
  const list=ROWS.filter(r=>(!fm||r.m===fm)&&(!fs||r.su===fs)&&(!fst||r.st===fst)&&(!fty||r.ty===fty)&&(!only||(saved.s[r.id]||'').trim())&&(!q||(r.id+' '+r.t+' '+r.s+' '+r.m).toLowerCase().includes(q)));
  document.getElementById('cnt').textContent=list.length+' of '+ROWS.length+' cases · '+Object.values(saved.s).filter(v=>v.trim()).length+' suggestions';
  tb.innerHTML=list.map(r=>{const v=saved.s[r.id]||r.rc||'';return '<tr><td>'+esc(r.m)+'</td><td class="story">'+esc(r.s)+'</td><td class="id">'+esc(r.id)+'</td><td class="case">'+esc(r.t)+'</td><td>'+esc(r.ty)+'</td><td><span class="pill '+esc((r.su||'').split(' ')[0])+'">'+esc(r.su)+'</span></td><td>'+esc(r.st)+'</td><td><span class="'+esc(r.lr)+'">'+esc(r.lr)+'</span></td><td class="sug"><textarea data-id="'+esc(r.id)+'" class="'+(v.trim()?'has':'')+'">'+esc(v)+'</textarea></td></tr>'}).join('');
}
function fmv(){return document.getElementById('fm').value}
tb.addEventListener('input',e=>{const t=e.target;if(t.dataset.id){saved.s[t.dataset.id]=t.value;t.classList.toggle('has',!!t.value.trim());store();document.getElementById('cnt').textContent=document.getElementById('cnt').textContent.replace(/\\d+ suggestions/,Object.values(saved.s).filter(v=>v.trim()).length+' suggestions')}});
['q','fm','fs','fst','fty','fsug'].forEach(id=>document.getElementById(id).addEventListener('input',render));
document.getElementById('clr').addEventListener('click',()=>{['q','fm','fs','fst','fty'].forEach(id=>document.getElementById(id).value='');document.getElementById('fsug').checked=false;render()});
document.getElementById('exp').addEventListener('click',()=>{
  const out={exported:new Date().toISOString(),usage:saved.usage||'',suggestions:Object.entries(saved.s).filter(([,v])=>v.trim()).map(([id,v])=>({id,suggestion:v.trim()}))};
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:'application/json'}));a.download='cepv2-review-suggestions.json';a.click();
});
render();
</script></body></html>`;
fs.writeFileSync(path.join(ROOT, 'report', 'TEST_CASES_REVIEW.html'), page);
console.log(`report/TEST_CASES_REVIEW.html: ${rows.length} cases`);
