// Plain-language result summary, printed after every run and saved as test-results/RESULT-SUMMARY.md.
//
// Sorts every result into a bucket that says what it means and what to do.
const fs = require('fs');
const path = require('path');

const BUCKETS = [
  ['failed', 'FAILED', 'The app did not behave as the story expects, or the test could not complete: review each one.'],
  ['environment', 'ENVIRONMENT', 'The app could not reach the server. Rerun once it is reachable.'],
  ['dataMissing', 'DATA MISSING', 'The data the test needs is not on this server.'],
  ['skipped', 'SKIPPED', 'Not run; the reason is given.'],
  ['passed', 'PASSED', 'Behaves as the story expects.'],
];

const firstLine = (s) =>
  String(s || '')
    // eslint-disable-next-line no-control-regex
    .replace(/\u001b\[[0-9;]*m/g, '')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !/^expect\(|^Expected|^Received|^Call log/.test(l)) || '';

class ResultSummaryReporter {
  constructor() {
    this.rows = [];
  }

  onTestEnd(test, result) {
    // Only the final attempt counts (retries are 0 locally; on CI a later attempt replaces the earlier one).
    if (result.retry < test.retries && result.status !== 'passed' && result.status !== 'skipped') return;
    const title = test.title;
    const blocker = [...test.annotations, ...result.annotations].find((a) => a.type === 'BLOCKER');
    const skip = test.annotations.find((a) => a.type === 'skip' || a.type === 'fixme');
    const error = firstLine(result.error && result.error.message);
    let bucket;
    let detail = '';
    if (result.status === 'skipped') {
      bucket = 'skipped';
      detail = (skip && skip.description) || 'skipped';
    } else if (result.status !== 'passed' && /DATA MISSING ON THIS SERVER/.test(error)) {
      bucket = 'dataMissing';
      detail = error.replace(/^Error:\s*/, '');
    } else if (
      result.status !== 'passed' &&
      (/ENVIRONMENT:/.test(error) || /net::ERR_|ECONNREFUSED|ECONNRESET|ERR_CONNECTION/.test(error))
    ) {
      bucket = 'environment';
      detail = error.replace(/^Error:\s*/, '');
    } else if (blocker && result.status !== 'passed') {
      bucket = 'environment';
      detail = error;
    } else if (result.status === 'passed') {
      bucket = 'passed';
    } else {
      bucket = 'failed';
      detail = /set-up/i.test(error) ? `SET-UP STEP FAILED -- ${error}` : error;
    }
    const file = path.relative(process.cwd(), test.location.file).replace(/\\/g, '/');
    this.rows.push({ bucket, title, detail, file: `${file}:${test.location.line}` });
  }

  onEnd() {
    if (!this.rows.length) return;
    const count = (b) => this.rows.filter((r) => r.bucket === b).length;
    const lines = ['', '==================== RESULT SUMMARY (plain language) ===================='];
    for (const [key, label, meaning] of BUCKETS)
      lines.push(`${label.padEnd(16)} ${String(count(key)).padStart(4)}   ${meaning}`);
    for (const [key, label] of BUCKETS) {
      if (key === 'passed' || !count(key)) continue;
      lines.push('', `--- ${label} ---`);
      for (const r of this.rows.filter((x) => x.bucket === key))
        lines.push(`  ${r.title}${r.detail ? `\n      ${r.detail}` : ''}`);
    }
    lines.push('', 'Full table: test-results/RESULT-SUMMARY.md', '');
    console.log(lines.join('\n'));

    const md = [
      '# Result summary',
      '',
      '| Result | Count | What it means |',
      '| --- | --- | --- |',
      ...BUCKETS.map(([key, label, meaning]) => `| ${label} | ${count(key)} | ${meaning} |`),
      '',
    ];
    for (const [key, label] of BUCKETS) {
      if (!count(key)) continue;
      md.push(`## ${label}`, '', '| Test | Detail | Where |', '| --- | --- | --- |');
      for (const r of this.rows.filter((x) => x.bucket === key))
        md.push(`| ${r.title.replace(/\|/g, '\\|')} | ${String(r.detail || '').replace(/\|/g, '\\|')} | ${r.file} |`);
      md.push('');
    }
    const out = path.join(process.cwd(), 'test-results', 'RESULT-SUMMARY.md');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, md.join('\n'));
  }
}

module.exports = ResultSummaryReporter;
