// Report for one complete run (scripts/run-full.sh): totals, a table per module, and every failure with its first error
// line and screenshot. Reads every *.json in the run folder.
// node scripts/full-run-report.js test-results/full/<stamp>   → report/runs/FULL_RUN_<stamp>.md
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const runDir = path.resolve(root, process.argv[2] || fs.readFileSync(path.join(root, 'test-results/full/latest.txt'), 'utf8').trim());
const stamp = path.basename(runDir);
const outDir = path.join(root, 'report', 'runs');
fs.mkdirSync(outDir, { recursive: true });

const rows = [];
const walk = (suite, stream) => {
  for (const spec of suite.specs || []) {
    for (const t of spec.tests) {
      const last = t.results[t.results.length - 1] || {};
      const status =
        t.status === 'skipped' ? 'skipped' : t.status === 'expected' ? 'passed' : t.status === 'flaky' ? 'flaky' : t.results.length ? 'failed' : 'not run';
      const err = (last.errors && last.errors[0] && (last.errors[0].message || '')) || '';
      const shot = (last.attachments || []).find((a) => a.contentType === 'image/png' && a.path);
      rows.push({
        stream,
        module: spec.file.split('/')[0],
        file: spec.file,
        title: spec.title,
        status,
        // eslint-disable-next-line no-control-regex
        error: err.replace(/\u001b\[[0-9;]*m/g, '').split('\n').find((l) => l.trim()) || '',
        shot: shot ? path.relative(outDir, shot.path).replace(/\\/g, '/') : '',
      });
    }
  }
  for (const s of suite.suites || []) walk(s, stream);
};

const jsons = fs.readdirSync(runDir).filter((f) => f.endsWith('.json'));
for (const f of jsons) {
  const r = JSON.parse(fs.readFileSync(path.join(runDir, f), 'utf8'));
  for (const s of r.suites || []) walk(s, f.replace('.json', ''));
}

const count = (list, st) => list.filter((r) => r.status === st).length;
const statuses = ['passed', 'failed', 'flaky', 'skipped', 'not run'];
const modules = [...new Set(rows.map((r) => r.module))].sort();
const caseId = (t) => (t.match(/^[A-Z]+-\d+(-\d+)?[a-z]?/) || [''])[0];

let md = `# CEP v2 complete run — ${stamp}\n\n`;
md += `Run folder: \`${path.relative(root, runDir).replace(/\\/g, '/')}\` (${jsons.join(', ')}). Deep cases (@long, @edge, @concurrency, `;
md += `@interruption, @performance), Module 02 and journeys left out. One run, no re-run: a failure here can still be flaky.\n\n`;
md += `## Totals\n\n| Total | ${statuses.join(' | ')} | Pass rate |\n|---|${statuses.map(() => '---').join('|')}|---|\n`;
const ran = rows.length - count(rows, 'skipped') - count(rows, 'not run');
md += `| ${rows.length} | ${statuses.map((s) => count(rows, s)).join(' | ')} | ${ran ? Math.round((100 * count(rows, 'passed')) / ran) : 0}% |\n\n`;
md += `## By module\n\n| Module | Total | ${statuses.join(' | ')} |\n|---|---|${statuses.map(() => '---').join('|')}|\n`;
for (const m of modules) {
  const l = rows.filter((r) => r.module === m);
  md += `| ${m} | ${l.length} | ${statuses.map((s) => count(l, s)).join(' | ')} |\n`;
}
md += `\n## Failures\n`;
for (const m of modules) {
  const l = rows.filter((r) => r.module === m && (r.status === 'failed' || r.status === 'flaky'));
  if (!l.length) continue;
  md += `\n### ${m} (${l.length})\n\n| Case | Title | Status | First error line | Screenshot |\n|---|---|---|---|---|\n`;
  for (const r of l) {
    const cell = (s) => s.replace(/\|/g, '\\|').slice(0, 220);
    md += `| ${caseId(r.title)} | ${cell(r.title)} | ${r.status} | ${cell(r.error)} | ${r.shot ? `[png](${r.shot})` : ''} |\n`;
  }
}
const notRun = rows.filter((r) => r.status === 'not run');
if (notRun.length) {
  md += `\n## Did not run (${notRun.length})\n\nUsually a run stopped early or a serial group stopped after a failure.\n\n`;
  for (const r of notRun) md += `- ${r.file} — ${r.title}\n`;
}

const outFile = path.join(outDir, `FULL_RUN_${stamp}.md`);
fs.writeFileSync(outFile, md);
fs.writeFileSync(path.join(outDir, `FULL_RUN_${stamp}.json`), JSON.stringify(rows, null, 1));
console.log(`Report: ${path.relative(root, outFile)}  (${rows.length} tests, ${count(rows, 'passed')} passed, ${count(rows, 'failed')} failed)`);
