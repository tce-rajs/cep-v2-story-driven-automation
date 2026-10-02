// Rebuilds CEPV2_Stories/CEPV2_TestCases.xlsx -- the ONE master file for stories, test cases, automation status and
// known bugs -- from the story files and the specs. One row per test case, plus a Summary sheet per module.
// Review comments already typed into the workbook are kept (matched by test case ID).
//   node scripts/build-workbook.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const XLSX = require('xlsx');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'CEPV2_Stories');
const TESTS = path.join(ROOT, 'tests');
const OUT = path.join(DIR, 'CEPV2_TestCases.xlsx');
const HEADER = [
  'Module No.',
  'Module',
  'Story ID',
  'Story',
  'User story',
  'Acceptance criteria',
  'Test case ID',
  'Test case',
  'Test type',
  'Automation status',
  'Known bug / skip reason',
  'Last run result',
  'Last run',
  'Review comments',
];
const TYPES = [
  'Negative',
  'Edge',
  'Regression',
  'Performance',
  'Concurrency',
  'Interruption',
  'Cross-Mode',
  'Positive',
];

// --- Review comments already in the workbook (columns found by name, so layout changes keep them) ---
const comments = new Map();
if (fs.existsSync(OUT)) {
  const old = XLSX.utils.sheet_to_json(XLSX.readFile(OUT).Sheets['CEP v2 Stories'], { header: 1 });
  const idCol = old[0].indexOf('Test case ID');
  const cmCol = old[0].indexOf('Review comments');
  for (const r of old.slice(1)) if (r[idCol] && r[cmCol]) comments.set(String(r[idCol]), r[cmCol]);
}

// --- Which case IDs are automated: Playwright's own test list (includes tests generated in loops) ---
const automated = new Set();
const addIds = (title) => {
  for (const m of title.matchAll(/\b[A-Z]+-\d\d-\w+/g)) automated.add(m[0]);
};
try {
  const out = execSync('npx playwright test --list --reporter=json', {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  });
  const walk = (s) => {
    for (const x of s.suites || []) walk(x);
    for (const sp of s.specs || []) if (!sp.file.includes('_probe')) addIds(sp.title);
  };
  // The JSON starts on its own line; log lines before it (dotenv) may contain braces.
  for (const s of JSON.parse(out.slice(out.search(/^\{/m))).suites) walk(s);
} catch (e) {
  console.warn(`playwright --list failed (${String(e.message).split('\n')[0]}); using spec titles only`);
}

// --- Known bugs (test.fail) and skips (test.fixme / test.skip) read from the specs ---
const notes = new Map(); // id -> { kind: 'bug' | 'skip', reason }
const specFiles = [];
const findSpecs = (d) => {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) {
      if (f !== '_probe') findSpecs(p);
    } else if (f.endsWith('.spec.js')) specFiles.push(p);
  }
};
findSpecs(TESTS);
for (const file of specFiles) {
  const src = fs.readFileSync(file, 'utf8');
  const consts = {};
  for (const m of src.matchAll(/const (\w+)\s*=\s*(['"`])([\s\S]*?)\2;/g)) consts[m[1]] = m[3];
  const resolve = (s) => s.replace(/\$\{(\w+)\}/g, (_, k) => consts[k] || k);
  const starts = [...src.matchAll(/\btest(?:\.(fixme|skip))?\(\s*(['"`])([\s\S]*?)\2/g)].filter((m) =>
    /[A-Z]+-\d\d-\w+/.test(m[3])
  );
  starts.forEach((m, i) => {
    addIds(m[3]); // literal titles count even if the Playwright list is unavailable
    const body = src.slice(m.index, i + 1 < starts.length ? starts[i + 1].index : src.length);
    let note = null;
    const fail = body.match(/test\.fail\(\s*[^,]+,\s*(?:(['"`])([\s\S]*?)\1|(\w+))/);
    if (m[1]) note = { kind: 'skip', reason: `${m[1]} (see spec)` };
    const skip = body.match(/test\.(?:fixme|skip)\(\s*(?:true|[^,()]+),\s*(['"`])([\s\S]*?)\1/);
    if (skip) note = { kind: 'skip', reason: resolve(skip[2]) };
    if (fail) note = { kind: 'bug', reason: resolve(fail[2] || consts[fail[3]] || fail[3]) };
    if (note) for (const id of m[3].matchAll(/\b[A-Z]+-\d\d-\w+/g)) notes.set(id[0], note);
  });
}

// --- Last run result: each case's latest result across report/runs/*.json (one file per run, oldest first) ---
// Two formats: Playwright's own JSON reporter output, and cep-results-v1 (a run log converted by log-to-results.js).
// Statuses are the raw outcome of the test's own checks; a known bug that still fails is "failed" here.
const RUNS = path.join(ROOT, 'report', 'runs');
const lastRun = new Map(); // id -> { status, when, account, build }
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
    const when = f.slice(4, 14) + ' ' + f.slice(15, 20).replace('-', ':');
    const put = (title, status) => {
      for (const m of title.matchAll(/\b[A-Z]+-\d\d-\w+/g))
        lastRun.set(m[0], { status, when, account: data.account || '', build: data.build || '' });
    };
    if (Array.isArray(data.tests)) {
      for (const t of data.tests) put(t.id, t.status);
    } else {
      const walk = (s) => {
        for (const x of s.suites || []) walk(x);
        for (const sp of s.specs || [])
          for (const t of sp.tests) {
            const r = t.results[t.results.length - 1];
            if (r) put(sp.title, r.status === 'passed' ? 'passed' : r.status === 'skipped' ? 'skipped' : 'failed');
          }
      };
      for (const s of data.suites || []) walk(s);
    }
  }
}
const LAST = ['Passed', 'Failed', 'Known bug still there', 'Known bug not seen (fixed?)', 'Skipped', 'Not run yet'];
const lastResult = (r, note, automatedStatus) => {
  if (!r) return automatedStatus ? 'Not run yet' : '';
  if (r.status === 'skipped') return 'Skipped';
  if (note && note.kind === 'bug')
    return r.status === 'failed' ? 'Known bug still there' : 'Known bug not seen (fixed?)';
  return r.status === 'passed' ? 'Passed' : 'Failed';
};

// --- Rows from the story files ---
const rows = [HEADER];
const summary = new Map();
const files = fs
  .readdirSync(DIR)
  .filter((f) => /^\d\d_.+\.md$/.test(f))
  .sort();
for (const file of files) {
  const [, no, rawName] = file.match(/^(\d\d)_(.+)\.md$/);
  const moduleName = rawName
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^AI(?=[A-Z])/, 'AI ');
  const sum = {
    no,
    moduleName,
    stories: 0,
    cases: 0,
    Automated: 0,
    'Known bug': 0,
    Skipped: 0,
    'Manual only': 0,
    'To automate': 0,
  };
  summary.set(no, sum);
  let storyId = '';
  let story = '';
  let userStory = '';
  let criteria = [];
  for (const line of fs.readFileSync(path.join(DIR, file), 'utf8').split(/\r?\n/)) {
    const h = line.match(/^###\s+([A-Z]+-\d+)\s+[—-]\s+(.+?)\s*(\(added [^)]*\))?\s*$/);
    if (h) {
      storyId = h[1];
      story = h[2];
      userStory = '';
      criteria = [];
      sum.stories++;
      continue;
    }
    const u = line.match(/^\*\*User story:\*\*\s+(.+)$/);
    if (u) userStory = u[1].replace(/\*\*/g, '');
    const a = line.match(/^- (AC\d+: .+)$/);
    if (a) criteria.push(a[1]);
    const c = line.match(/^\d+\.\s+([A-Z]+-\d+-[\w]+)\s+[—-]\s+(.+)$/);
    if (!c || !storyId) continue;
    const [, id, raw] = c;
    const text = raw.replace(/\*\*/g, '');
    const lead = text.replace(/^\((manual)\)\s*/i, '').match(/^([A-Za-z-]+)/);
    const type = lead && TYPES.includes(lead[1]) ? (lead[1] === 'Positive' ? 'Functional' : lead[1]) : 'Functional';
    const manual = /\(manual|manual-only|Manual-only|excluded from automation/i.test(text) || storyId.startsWith('SB-');
    const note = notes.get(id);
    let status;
    if (manual && !automated.has(id)) status = 'Manual only';
    else if (note && note.kind === 'bug') status = 'Known bug';
    else if (note && note.kind === 'skip') status = 'Skipped';
    else if (automated.has(id)) status = 'Automated';
    else status = manual ? 'Manual only' : 'To automate';
    sum.cases++;
    sum[status]++;
    const run = lastRun.get(id);
    const result = lastResult(run, note, ['Automated', 'Known bug', 'Skipped'].includes(status));
    if (result) sum[`last:${result}`] = (sum[`last:${result}`] || 0) + 1;
    rows.push([
      no,
      moduleName,
      storyId,
      story,
      userStory,
      criteria.join('\n'),
      id,
      text,
      type,
      status,
      note ? note.reason.replace(/\s+/g, ' ') : '',
      result,
      run ? [run.when, run.build, run.account].filter(Boolean).join(' | ') : '',
      comments.get(id) || '',
    ]);
  }
}

// --- Sheets ---
const ws = XLSX.utils.aoa_to_sheet(rows);
ws['!cols'] = [8, 18, 10, 28, 55, 55, 14, 85, 13, 15, 45, 22, 34, 30].map((wch) => ({ wch }));
ws['!autofilter'] = { ref: `A1:N${rows.length}` };

const sumRows = [
  [
    'Module No.',
    'Module',
    'Stories',
    'Test cases',
    'Automated',
    'Known bug',
    'Skipped',
    'Manual only',
    'To automate',
    '',
    ...LAST.map((k) => `Last run: ${k}`),
  ],
];
const total = { stories: 0, cases: 0, Automated: 0, 'Known bug': 0, Skipped: 0, 'Manual only': 0, 'To automate': 0 };
for (const s of summary.values()) {
  sumRows.push([
    s.no,
    s.moduleName,
    s.stories,
    s.cases,
    s.Automated,
    s['Known bug'],
    s.Skipped,
    s['Manual only'],
    s['To automate'],
    '',
    ...LAST.map((k) => s[`last:${k}`] || 0),
  ]);
  for (const k of [...Object.keys(total).filter((x) => !x.startsWith('last:')), ...LAST.map((x) => `last:${x}`)])
    total[k] = (total[k] || 0) + (s[k] || 0);
}
sumRows.push([
  '',
  'Total',
  total.stories,
  total.cases,
  total.Automated,
  total['Known bug'],
  total.Skipped,
  total['Manual only'],
  total['To automate'],
  '',
  ...LAST.map((k) => total[`last:${k}`] || 0),
]);
sumRows.push([]);
sumRows.push(['', 'How to read the Automation status column']);
sumRows.push(['', 'Automated', 'An automated test exists and checks this case.']);
sumRows.push(['', 'Known bug', 'Automated; the app currently fails it (test.fail). The reason is the product bug.']);
sumRows.push(['', 'Skipped', 'Automated but skipped for a stated reason (data, device or owner decision missing).']);
sumRows.push(['', 'Manual only', 'Needs a person: Plan Mode, installing, hardware, second screens.']);
sumRows.push(['', 'To automate', 'No automated test yet.']);
sumRows.push([]);
sumRows.push(['', 'How to read the Last run result column (latest result per case across report/runs/)']);
sumRows.push(['', 'Passed', 'The test ran and the app behaved as the story expects.']);
sumRows.push(['', 'Failed', 'The test ran and failed: a new product bug or a test/data problem to triage.']);
sumRows.push(['', 'Known bug still there', 'A recorded product bug is still present.']);
sumRows.push(['', 'Known bug not seen (fixed?)', 'A recorded bug did not happen: maybe fixed; confirm by hand.']);
sumRows.push(['', 'Skipped', 'The test skipped itself with a reason.']);
sumRows.push(['', 'Not run yet', 'Automated, but no result recorded yet.']);
sumRows.push([]);
sumRows.push([
  '',
  `Built ${new Date().toISOString().slice(0, 10)} by scripts/build-workbook.js from CEPV2_Stories/*.md and tests/.`,
]);
const sws = XLSX.utils.aoa_to_sheet(sumRows);
sws['!cols'] = [10, 32, 9, 11, 11, 11, 9, 12, 12].map((wch) => ({ wch }));

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, sws, 'Summary');
XLSX.utils.book_append_sheet(wb, ws, 'CEP v2 Stories');
XLSX.writeFile(wb, OUT);
console.log(
  `${rows.length - 1} test cases -> ${path.relative(process.cwd(), OUT)} | ` +
    Object.entries(total)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
);
