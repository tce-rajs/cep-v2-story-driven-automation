// Builds report/BUG_TRIAGE.md -- the detailed triage list behind the clear BUG_LIST.md (build-bug-report.js) -- from the latest result of every test case (report/runs/*.json, one
// file per run, latest result wins) plus the story text and the specs' known-bug notes (test.fail reasons).
// Sections: confirmed product bugs still present, failures to triage (new), known bugs not seen this time (fixed?),
// environment and missing-data failures. Replaces nothing: the old list is BUG_LIST_OLD.md (do not use).
//   node scripts/build-bug-list.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RUNS = path.join(ROOT, 'report', 'runs');
const OUT = path.join(ROOT, 'report', 'BUG_TRIAGE.md');

// --- Story text per case ---
const cases = new Map();
for (const f of fs.readdirSync(path.join(ROOT, 'CEPV2_Stories')).filter((n) => /^\d\d_.+\.md$/.test(n))) {
  const moduleName = f.replace(/^\d\d_|\.md$/g, '').replace(/_/g, ' ');
  for (const line of fs.readFileSync(path.join(ROOT, 'CEPV2_Stories', f), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\d+\.\s+([A-Z]+-\d+-\w+)\s+—\s+(.+)$/);
    if (m) cases.set(m[1], { module: moduleName, text: m[2].replace(/\*\*/g, '').replace(/\s+_\(.*?\)_/g, '') });
  }
}

// --- Known-bug reasons (test.fail) and their spec file, from the specs ---
const known = new Map();
const specs = [];
const walkDir = (d) => {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) {
      if (f !== '_probe') walkDir(p);
    } else if (f.endsWith('.spec.js')) specs.push(p);
  }
};
walkDir(path.join(ROOT, 'tests'));
for (const file of specs) {
  const src = fs.readFileSync(file, 'utf8');
  const consts = {};
  for (const m of src.matchAll(/const (\w+)\s*=\s*(['"`])([\s\S]*?)\2;/g)) consts[m[1]] = m[3];
  const starts = [...src.matchAll(/\btest(?:\.(?:fixme|skip))?\(\s*(['"`])([\s\S]*?)\1/g)].filter((m) =>
    /[A-Z]+-\d\d-\w+/.test(m[2])
  );
  starts.forEach((m, i) => {
    const body = src.slice(m.index, i + 1 < starts.length ? starts[i + 1].index : src.length);
    const fail = body.match(/test\.fail\(\s*[^,]+,\s*(?:(['"`])([\s\S]*?)\1|(\w+))/);
    if (!fail) return;
    const reason = (fail[2] || consts[fail[3]] || fail[3] || '').replace(/\$\{(\w+)\}/g, (_, k) => consts[k] || k);
    for (const id of m[2].matchAll(/\b[A-Z]+-\d\d-\w+/g))
      known.set(id[0], {
        reason: reason.replace(/\s+/g, ' '),
        file: path.relative(ROOT, file).split(path.sep).join('/'),
      });
  });
}

// --- Latest result per case across report/runs ---
const latest = new Map();
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
  const when = `${f.slice(4, 14)} ${f.slice(15, 20).replace('-', ':')}`;
  const put = (title, status, error, file) => {
    const m = title.match(/^([A-Z]+-\d\d-\w+)/);
    if (m) latest.set(m[1], { status, error, file, when, build: data.build || '', account: data.account || '' });
  };
  if (Array.isArray(data.tests)) {
    for (const t of data.tests) put(t.id, t.status, '', t.file);
  } else {
    const walk = (s) => {
      for (const x of s.suites || []) walk(x);
      for (const sp of s.specs || [])
        for (const t of sp.tests) {
          const r = t.results[t.results.length - 1];
          if (!r) continue;
          const status = r.status === 'passed' ? 'passed' : r.status === 'skipped' ? 'skipped' : 'failed';
          // The full message is kept for sorting (a timeout's first line does not say what it waited for); tables show line 1.
          const error = ((r.error && r.error.message) || '').replace(
            new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g'),
            ''
          );
          put(sp.title, status, error, sp.file);
        }
    };
    for (const s of data.suites || []) walk(s);
  }
}

const ENV = /Teach window|connection-error|Unable to connect|ENVIRONMENT|browser has been closed|net::ERR/i;
const DATA = /DATA MISSING/i;
// Failures where the test itself could not get to the check (navigation in the client, time limits, set-up steps,
// teardown) are test problems to fix in the suite; the rest are real assertion results -- possible product bugs.
const TEST_PROBLEM =
  /playlist-select-(chapter|topic)|common-select|All My Classes|Test timeout|set-up|SET-UP|dispose|scrollIntoViewIfNeeded|boundingBox/i;
const rows = { bug: [], newFail: [], testProblem: [], gone: [], env: [], data: [] };
for (const [id, r] of latest) {
  const k = known.get(id);
  const c = cases.get(id) || { module: '?', text: '' };
  const item = { id, ...r, ...c, reason: k ? k.reason : '', spec: k ? k.file : r.file };
  if (r.status === 'skipped') continue;
  if (k) (r.status === 'failed' ? rows.bug : rows.gone).push(item);
  else if (r.status === 'failed') {
    if (DATA.test(r.error)) rows.data.push(item);
    else if (ENV.test(r.error)) rows.env.push(item);
    else if (TEST_PROBLEM.test(r.error)) rows.testProblem.push(item);
    else rows.newFail.push(item);
  }
}
const byModule = (a, b) => a.module.localeCompare(b.module) || a.id.localeCompare(b.id, 'en', { numeric: true });
const rerun = (it) => `\`npx playwright test ${it.spec || ''} --grep "${it.id}:"\``;
const esc = (s) => String(s || '').replace(/\|/g, '\\|');
const lines = [];
lines.push('# Bug list (current)');
lines.push('');
lines.push(
  `Built ${new Date().toISOString().slice(0, 16).replace('T', ' ')} by \`scripts/build-bug-list.js\` from each test ` +
    "case's latest result in `report/runs/` (desktop client, Ultra server). The old list is `BUG_LIST_OLD.md` -- do " +
    'not take any reference from it. Each case, its story and its status are also in the master workbook ' +
    '(`CEPV2_Stories/CEPV2_TestCases.xlsx`).'
);
lines.push('');
lines.push('| Section | Count |');
lines.push('| --- | --- |');
lines.push(`| 1. Confirmed product bugs, still present | ${rows.bug.length} |`);
lines.push(
  `| 2. New failures -- possible product bugs (the app did not do what the story expects) | ${rows.newFail.length} |`
);
lines.push(`| 2b. New failures -- test problems (the test could not reach its check) | ${rows.testProblem.length} |`);
lines.push(`| 3. Recorded bugs not seen this time (fixed? confirm by hand) | ${rows.gone.length} |`);
lines.push(
  `| 4. Environment (the client could not start / reach the server) -- not product bugs | ${rows.env.length} |`
);
lines.push(`| 5. Data missing on this server -- not product bugs | ${rows.data.length} |`);
const table = (title, items, cols) => {
  lines.push('');
  lines.push(`## ${title}`);
  lines.push('');
  if (!items.length) {
    lines.push('None.');
    return;
  }
  lines.push(`| ID | Module | Expected (story) | ${cols[0]} | Last run | Rerun |`);
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const it of items.sort(byModule))
    lines.push(
      `| ${it.id} | ${esc(it.module)} | ${esc(it.text)} | ${esc(cols[1](it))} | ${it.when} ${esc(it.build)} | ${rerun(it)} |`
    );
};
table('1. Confirmed product bugs, still present', rows.bug, ['What goes wrong', (it) => it.reason]);
table('2. New failures -- possible product bugs (confirm each by hand)', rows.newFail, [
  'What the test saw',
  (it) => it.error.split('\n')[0].slice(0, 160),
]);
table('2b. New failures -- test problems to fix in the suite', rows.testProblem, [
  'Error',
  (it) => it.error.split('\n')[0].slice(0, 120),
]);
table('3. Recorded bugs not seen this time (fixed?)', rows.gone, ['Recorded bug', (it) => it.reason]);
table('4. Environment -- not product bugs', rows.env, ['Error', (it) => it.error.split('\n')[0].slice(0, 120)]);
table('5. Data missing on this server -- not product bugs', rows.data, [
  'Error',
  (it) => it.error.split('\n')[0].slice(0, 160),
]);
// Bugs confirmed outside the automated suite (long writing runs, recorded sessions), with their evidence.
const findings = JSON.parse(fs.readFileSync(path.join(__dirname, 'bug-findings.json'), 'utf8'));
lines.push('');
lines.push('## 6. Confirmed in recorded sessions and long runs (not yet covered by an automated test)');
for (const b of findings) {
  lines.push('');
  lines.push(`### ${b.id} -- ${b.title}`);
  lines.push('');
  lines.push(`- Module: ${b.module} | Severity: ${b.severity} | Found: ${b.found}`);
  lines.push(`- Steps: ${b.steps}`);
  lines.push(`- Expected: ${b.expected}`);
  lines.push(`- Actual: ${b.actual}`);
  lines.push(`- Evidence: \`${b.evidence}\``);
}
fs.writeFileSync(OUT, lines.join('\n') + '\n');
console.log(
  `report/BUG_TRIAGE.md: ${rows.bug.length} bugs, ${rows.newFail.length} possible bugs, ${rows.testProblem.length} test problems, ${rows.gone.length} not seen, ` +
    `${rows.env.length} environment, ${rows.data.length} data missing`
);
