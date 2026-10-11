// Builds report/FINAL_FAILURES_<date>.md: every case that failed in the first run AND again in the re-run (= real
// failure), with its story, title and the first line of the error, grouped by module.
// node scripts/final-issue-list.js <first-run.json …> -- <rerun.json …>
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const cut = args.indexOf('--');
const firstFiles = args.slice(0, cut);
const rerunFiles = args.slice(cut + 1);

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
        out.set(spec.title, { id, title: spec.title, status: r.status, err: err.trim().slice(0, 220), file: suite.file || file });
      }
    for (const child of suite.suites || []) walk(child, suite.file || file);
  };
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    const raw = fs.readFileSync(f, 'utf8');
    for (const s of JSON.parse(raw.slice(raw.search(/^\{\s*$/m))).suites || []) walk(s, s.file);
  }
  return out;
};
const first = read(firstFiles);
const rerun = read(rerunFiles);
const bad = (s) => s === 'failed' || s === 'timedOut';
const real = [...rerun.values()].filter((r) => bad(r.status) && first.has(r.title) && bad(first.get(r.title).status));
const flaky = [...rerun.values()].filter((r) => r.status === 'passed' && first.has(r.title) && bad(first.get(r.title).status));
const dataMissing = real.filter((r) => /DATA MISSING/.test(r.err));
const env = real.filter((r) => /ENVIRONMENT:/.test(r.err));
const product = real.filter((r) => !dataMissing.includes(r) && !env.includes(r));

const byModule = new Map();
for (const r of product) {
  const mod = (r.file || '').split(/[\\/]/)[0] || r.id.split('-')[0];
  if (!byModule.has(mod)) byModule.set(mod, []);
  byModule.get(mod).push(r);
}
const date = new Date().toISOString().slice(0, 10);
let md = `# Final failure list — CEP v2, build 0.0.236, ${date}\n\n`;
md += `A case is listed only if it failed in the full run AND again when re-run on its own (= real product failure).\n\n`;
md += `| | Cases |\n| --- | --- |\n| Real failures (product) | ${product.length} |\n| Data missing (test data used up) | ${dataMissing.length} |\n| Environment | ${env.length} |\n| Passed on re-run (flaky / parallel clash) | ${flaky.length} |\n\n`;
md += `Exploration findings with screenshots: report/exploration/PHASE1_SUMMARY.md and flows.md.\n\n`;
for (const [mod, rows] of [...byModule.entries()].sort()) {
  md += `## ${mod} (${rows.length})\n\n| Case | What fails | First error line |\n| --- | --- | --- |\n`;
  for (const r of rows.sort((a, b) => a.title.localeCompare(b.title)))
    md += `| ${r.id} | ${r.title.replace(/^[A-Z]+-\d\d-\w+:\s*/, '').replace(/\|/g, '/')} | ${r.err.replace(/\|/g, '/')} |\n`;
  md += '\n';
}
if (dataMissing.length) md += `## Data missing\n\n${dataMissing.map((r) => `- ${r.id}: ${r.err}`).join('\n')}\n\n`;
if (flaky.length) md += `## Passed on re-run (not bugs; watch for flakiness)\n\n${flaky.map((r) => r.id).join(', ')}\n`;
const out = path.join(__dirname, '..', 'report', 'bugs', `FINAL_FAILURES_${date}.md`);
fs.writeFileSync(out, md);
console.log(`${out}: ${product.length} real, ${dataMissing.length} data missing, ${env.length} env, ${flaky.length} flaky`);
