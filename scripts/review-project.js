// Project review: checks the user stories, test cases and test code against the rules in CEPV2_Stories/PROCESS.md
// and common industry practice (unique IDs, one expected result, testable criteria, traceability, no false passes).
// Writes reports/review/REVIEW_FINDINGS.json and prints a summary. node scripts/review-project.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STORIES = path.join(ROOT, 'CEPV2_Stories');
const out = { stories: [], cases: [], code: [], counts: {} };
const add = (bucket, item) => out[bucket].push(item);

// ---------------------------------------------------------------- stories and cases
const caseIds = new Map();
const storyFiles = fs.readdirSync(STORIES).filter((f) => /^\d\d_.+\.md$/.test(f));
let storyCount = 0;
let caseCount = 0;
for (const file of storyFiles) {
  const text = fs.readFileSync(path.join(STORIES, file), 'utf8');
  const blocks = text.split(/^### /m).slice(1);
  for (const block of blocks) {
    storyCount++;
    const head = block.split('\n')[0];
    const sid = (head.match(/^([A-Z]+-\d\d)/) || [])[1] || head.slice(0, 20);
    if (!/\*\*User story:\*\*\s*As /i.test(block)) add('stories', { file, story: sid, issue: 'no "As a …, I want …, so that …" user story' });
    else if (!/so\s+that/i.test(block)) add('stories', { file, story: sid, issue: 'user story has no "so that" (value) part' });
    const acs = block.match(/^- AC\d+:/gm) || [];
    if (!acs.length) add('stories', { file, story: sid, issue: 'no acceptance criteria' });
    const cases = [...block.matchAll(/^(\d+)\.\s+([A-Z]+-\d\d-\w+)\s+—\s+(.*)$/gm)];
    if (!cases.length) add('stories', { file, story: sid, issue: 'no test cases' });
    const hasNegative = cases.some((c) => /^Negative/i.test(c[3]));
    if (cases.length && !hasNegative && !/^(FLOW|XC|CLI)/.test(sid)) add('stories', { file, story: sid, issue: 'no negative case' });
    for (const [, n, id, line] of cases) {
      caseCount++;
      if (!id.startsWith(`${sid}-`)) add('cases', { file, id, issue: `case ID does not belong to story ${sid}` });
      if (caseIds.has(id)) add('cases', { file, id, issue: `duplicate case ID (also in ${caseIds.get(id)})` });
      caseIds.set(id, file);
      const body = line.replace(/_\([^)]*\)_/g, '').replace(/^(Negative|Regression|Edge|Interruption|Concurrency|Performance|Cross-Mode|Manual)[^:]*:\s*/i, '');
      if (!/^(To check|_Hand-off:_ to check|to check)/i.test(body.trim()) && !/^Regression:/i.test(line)) add('cases', { file, id, issue: 'does not start with "To check …" (expected-result form)' });
      const ands = (body.match(/\b(and then|, then|; then)\b/gi) || []).length;
      if (ands >= 1 || body.length > 260) add('cases', { file, id, issue: 'may check more than one result (long or chained case)' });
      if (/\b(etc\.?|properly|correctly|works fine|as expected)\b/i.test(body) && !/correct (score|answer|value)/i.test(body))
        add('cases', { file, id, issue: 'vague expected result ("properly / correctly / as expected / etc.")' });
    }
  }
}
out.counts.stories = storyCount;
out.counts.cases = caseCount;

// ---------------------------------------------------------------- test code
const walk = (dir, acc = []) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (!/_probe|node_modules/.test(f)) walk(p, acc);
    } else if (f.endsWith('.spec.js')) acc.push(p);
  }
  return acc;
};
const specs = [...walk(path.join(ROOT, 'tests')), ...walk(path.join(ROOT, 'client-automation', 'tests'))];
const testIds = new Map();
for (const p of specs) {
  const rel = path.relative(ROOT, p);
  const src = fs.readFileSync(p, 'utf8');
  for (const m of src.matchAll(/test\(\s*[`'"]([A-Z]+-\d\d-\w+):/g)) {
    if (!caseIds.has(m[1]) && !/\$\{/.test(m[0])) add('code', { file: rel, id: m[1], issue: 'test ID not found in any story (traceability broken)' });
    testIds.set(m[1], (testIds.get(m[1]) || 0) + 1);
  }
  if (/test\.fail\(/.test(src)) add('code', { file: rel, issue: 'test.fail() used — a known bug would be hidden as a pass' });
  if (/test\.only\(/.test(src)) add('code', { file: rel, issue: 'test.only left in — would run one test only' });
  // A test body with no expect at all.
  for (const m of src.matchAll(/test\(\s*[`'"]([A-Z]+-\d\d-\w+)[^`'"]*[`'"][\s\S]*?async\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\n\s{2,4}\}\s*\)?;?\s*\n/g)) {
    const body = m[2];
    if (!/expect|toBe|toHave|assert|throw new Error/.test(body) && !/test\.skip|test\.fixme/.test(body))
      add('code', { file: rel, id: m[1], issue: 'test body has no assertion (could pass while the feature is broken)' });
  }
  const swallowed = (src.match(/expect\([^;]*?\)\.[a-zA-Z]+\([^;]*?\)\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)/g) || []).length;
  if (swallowed) add('code', { file: rel, issue: `${swallowed} assertion(s) with .catch(() => {}) — failure is swallowed` });
  if (/(password|pin)\s*[:=]\s*['"][^'"$]{4,}['"]/i.test(src) && !/process\.env/.test(src.match(/(password|pin)\s*[:=]\s*['"][^'"$]{4,}['"]/i)[0]))
    add('code', { file: rel, issue: 'possible hard-coded password / PIN (should come from .env)' });
  const waits = (src.match(/waitForTimeout\(\s*\d{4,}/g) || []).length;
  if (waits > 8) add('code', { file: rel, issue: `${waits} fixed waits of 1 s or more (slow / flaky; prefer waiting for a state)` });
}
out.counts.specFiles = specs.length;
out.counts.testIds = testIds.size;

const dir = path.join(ROOT, 'report', 'review');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'REVIEW_FINDINGS.json'), JSON.stringify(out, null, 2));
const sum = (arr) =>
  Object.entries(arr.reduce((a, x) => ((a[x.issue.replace(/\(also in.*|\d+ /g, '')] = (a[x.issue.replace(/\(also in.*|\d+ /g, '')] || 0) + 1), a), {}))
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `  ${v} × ${k}`)
    .join('\n');
console.log(`Stories ${storyCount}, cases ${caseCount}, spec files ${specs.length}, test IDs ${testIds.size}`);
console.log(`STORY issues (${out.stories.length}):\n${sum(out.stories)}`);
console.log(`CASE issues (${out.cases.length}):\n${sum(out.cases)}`);
console.log(`CODE issues (${out.code.length}):\n${sum(out.code)}`);
