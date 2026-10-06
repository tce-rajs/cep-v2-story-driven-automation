// Builds the clear bug list (BUG_LIST.md): one entry per bug -- title, short description, how to rerun it.
// The bugs are curated in scripts/bugs.json (one entry per product bug, with the test case IDs that show it); the
// rerun command is worked out from the specs, so it always points at the right file.
//   node scripts/build-bug-report.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const bugs = JSON.parse(fs.readFileSync(path.join(__dirname, 'bugs.json'), 'utf8'));

// Which spec file holds each test case ID (literal titles, plus generated ones by their story prefix).
const specOf = new Map();
const walk = (d) => {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.spec.js')) {
      const rel = path.relative(ROOT, p).split(path.sep).join('/');
      const src = fs.readFileSync(p, 'utf8');
      for (const m of src.matchAll(/\b([A-Z]+-\d\d-\w+)\b/g)) if (!specOf.has(m[1])) specOf.set(m[1], rel);
      for (const m of src.matchAll(/\b([A-Z]+-\d\d)-\$\{/g)) if (!specOf.has(m[1])) specOf.set(m[1], rel);
    }
  }
};
walk(path.join(ROOT, 'tests'));

const rerun = (b) => {
  if (b.rerun) return b.rerun;
  const files = [...new Set(b.ids.map((id) => specOf.get(id) || specOf.get(id.replace(/-\w+$/, ''))).filter(Boolean))];
  if (!files.length) return 'No automated test yet -- see the evidence.';
  const grep = b.ids.length === 1 ? `${b.ids[0]}:` : `(${b.ids.join('|')}):`;
  return `npx playwright test ${files.join(' ')} --grep "${grep}"`;
};

// Latest recheck of each test case (report/runs/*.json, latest file wins). A failure counts as the bug showing
// itself only when the app gave a real wrong result -- a timeout, a click that never landed or the client not
// starting means the test did not reach the bug ("Couldn't check").
const RUNS = path.join(ROOT, 'report', 'runs');
const latest = new Map();
if (fs.existsSync(RUNS)) {
  for (const f of fs
    .readdirSync(RUNS)
    .filter((n) => /^run_.+\.json$/.test(n))
    .sort()) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(path.join(RUNS, f), 'utf8'));
    } catch {
      continue;
    }
    if (!data.suites) continue; // converted logs carry no error text, so they cannot tell a timeout from a real result
    const when = `${f.slice(4, 14)} ${f.slice(15, 20).replace('-', ':')}`;
    const visit = (s) => {
      for (const x of s.suites || []) visit(x);
      for (const sp of s.specs || [])
        for (const t of sp.tests) {
          const r = t.results[t.results.length - 1];
          const id = (sp.title.match(/^([A-Z]+-\d\d-\w+)/) || [])[1];
          if (!r || !id) continue;
          const err = ((r.error && r.error.message) || '').replace(
            new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g'),
            ''
          ); // strip terminal colours
          latest.set(id, { status: r.status, err, when });
        }
    };
    for (const s of data.suites) visit(s);
  }
}
const NOT_REACHED =
  /Timeout \d+ms exceeded|Test timeout|Teach window|browser has been closed|ENVIRONMENT|DATA MISSING/i;
const verdictOf = (id) => {
  const r = latest.get(id);
  if (!r) return null;
  if (r.status === 'skipped') return 'Skipped';
  if (r.status === 'passed') return 'Not seen';
  return NOT_REACHED.test(r.err) ? "Couldn't check" : 'Still there';
};
const recheck = (b) => {
  if (b.recheck) return b.recheck; // observed by hand / in a recorded session (bugs without an automated test)
  const v = b.ids.map(verdictOf).filter(Boolean);
  if (!v.length) return 'Not rechecked';
  const best = ['Still there', 'Not seen', "Couldn't check", 'Skipped'].find((k) => v.includes(k));
  const when = Math.max(...b.ids.map((id) => (latest.get(id) ? Date.parse(latest.get(id).when) : 0)));
  return `${best === 'Still there' ? '❌ Still there' : best === 'Not seen' ? '✅ Not seen (fixed?)' : best === 'Skipped' ? '⏭️ Skipped' : "⚠️ Couldn't check"} (${new Date(when).toISOString().slice(5, 10)})`;
};

const SEV = ['High', 'Medium', 'Low'];
const out = [];
out.push('# CEP v2 -- Bug list');
out.push('');
out.push(
  `Ultra server, build v0.0.236, desktop client, ${new Date().toISOString().slice(0, 10)}. ` +
    `**${bugs.length} bugs:** ${SEV.map((s) => `${bugs.filter((b) => b.severity === s).length} ${s}`).join(', ')}. ` +
    'To check a bug again, run its command in the project folder.'
);
// One simple table per severity: number, bug, what happens, how to rerun. Each description is one sentence
// (scripts/bugs.json), shown in full.
const short = (s) => s.replace(/\|/g, '/');
const how = (b) => {
  const cmd = rerun(b);
  return cmd.startsWith('No automated') ? `Check by hand${b.evidence ? `: ${b.evidence}` : ''}` : `\`${cmd}\``;
};
let n = 0;
for (const s of SEV) {
  out.push('');
  out.push(`## ${s}`);
  out.push('');
  // The Recheck column is off for the team presentation (owner, 2026-10-06); SHOW_RECHECK=1 adds it back.
  const withRecheck = !!process.env.SHOW_RECHECK;
  out.push(`| No. | Bug | What happens |${withRecheck ? ' Recheck |' : ''} How to rerun |`);
  out.push(`| --- | --- | --- |${withRecheck ? ' --- |' : ''} --- |`);
  for (const b of bugs.filter((x) => x.severity === s)) {
    n++;
    const cells = [`**${b.title.replace(/\|/g, '/')}**`, short(b.description)];
    if (withRecheck) cells.push(recheck(b));
    cells.push(how(b).replace(/\|/g, '\\|'));
    out.push(`| ${n} | ${cells.join(' | ')} |`);
  }
}
if (process.env.SHOW_RECHECK) {
  out.push('');
  out.push(
    '**Recheck:** ❌ Still there = the bug happened again. ✅ Not seen = the check passed (maybe fixed; confirm by hand). ' +
      "⚠️ Couldn't check = the test did not reach the bug (a timeout or the client not starting). Date = when it was last run."
  );
}
fs.writeFileSync(path.join(ROOT, 'BUG_LIST.md'), out.join('\n') + '\n');
console.log(
  `BUG_LIST.md: ${bugs.length} bugs (${SEV.map((s) => `${bugs.filter((b) => b.severity === s).length} ${s}`).join(', ')})`
);
