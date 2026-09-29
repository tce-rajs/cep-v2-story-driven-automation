// Plain-language result summary, printed after every run and saved as test-results/RESULT-SUMMARY.md.
//
// Playwright's own counts mix things up for a reader: a KNOWN product bug (test.fail) is counted as "passed" while the
// bug is still there, and "failed" can mean a product bug, a test problem or a down server. This sorts every result into
// one of six buckets that say what it means and what to do:
//
//   WORKS              the feature behaved as the story expects
//   KNOWN BUG          a bug already recorded on the test (test.fail) is still there -- nothing new
//   KNOWN BUG GONE?    a recorded bug did NOT happen this time: fixed, or intermittent -- check by hand, then remove
//                      the test.fail if it is really fixed
//   NEW FAILURE        not expected to fail: a NEW product bug OR a test problem -- triage before calling it a bug
//                      (a "set-up:" failure means the step before the check broke, so the check itself never ran)
//   ENVIRONMENT        failed with the app's "Unable to connect ClassEdge server" blocker showing, or an
//                      "ENVIRONMENT:" error (e.g. screen recording impossible on a plain-http server) -- not a product-code bug
//   DATA MISSING       the class/topic data the test needs does not exist on this server (config/moduleClassMap.js
//                      marks it `unavailable`) -- not a product bug; add the data or point the key elsewhere
//   SKIPPED            not run, with the reason (missing data, account or device)
const fs = require('fs');
const path = require('path');

const BUCKETS = [
  ['newFailure', 'NEW FAILURE', 'Not expected to fail. A new product bug OR a test problem: triage each one.'],
  ['knownGone', 'KNOWN BUG GONE?', 'A recorded bug did not happen. Fixed or intermittent: check by hand.'],
  ['environment', 'ENVIRONMENT', 'The app could not reach the server. Rerun; not a product bug.'],
  ['dataMissing', 'DATA MISSING', 'The data the test needs is not on this server. Not a product bug.'],
  ['knownBug', 'KNOWN BUG', 'A recorded product bug is still there (counted as "passed" by Playwright).'],
  ['skipped', 'SKIPPED', 'Not run; the reason is given.'],
  ['works', 'WORKS', 'Behaves as the story expects.'],
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
    const known = test.annotations.find((a) => a.type === 'fail');
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
    } else if (result.status !== 'passed' && /ENVIRONMENT:/.test(error)) {
      bucket = 'environment';
      detail = error.replace(/^Error:\s*/, '');
    } else if (blocker && result.status !== 'passed') {
      bucket = 'environment';
      detail = error;
    } else if (test.expectedStatus === 'failed') {
      // test.fail(): result.status is what really happened. "failed" = the recorded bug is still there (Playwright then
      // counts that as a pass); "passed" = the bug did not happen this time.
      bucket = result.status === 'passed' ? 'knownGone' : 'knownBug';
      detail = known && known.description;
    } else if (result.status === 'passed') {
      bucket = 'works';
    } else {
      bucket = 'newFailure';
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
      if (key === 'works' || !count(key)) continue;
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
