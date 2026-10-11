// Removes the automated tests of cases marked _(improvement …)_ in the stories: improvements stay in the stories and
// the workbook as a record, but are not part of the automated suite.
// Usage: node scripts/remove-improvement-tests.js          (list only)
//        node scripts/remove-improvement-tests.js --apply  (remove the tests)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const apply = process.argv.includes('--apply');

const improvements = new Set();
for (const f of fs.readdirSync(path.join(ROOT, 'CEPV2_Stories')).filter((x) => /^\d\d_.+\.md$/.test(x)))
  for (const m of fs
    .readFileSync(path.join(ROOT, 'CEPV2_Stories', f), 'utf8')
    .matchAll(/^\d+\.\s+([A-Z]+-\d\d-\w+)\s+—.*_\(\s*improvement/gm))
    improvements.add(m[1]);

/** The full `test(...)` call starting at index `start` (balanced parentheses, string-aware), with its trailing ";\n". */
const callEnd = (src, start) => {
  let depth = 0;
  let quote = null;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if (ch === '/' && src[i + 1] === '/') i = src.indexOf('\n', i) - 1;
    else if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) {
        let end = i + 1;
        if (src[end] === ';') end++;
        if (src[end] === '\n') end++;
        return end;
      }
    }
  }
  return -1;
};

const removed = [];
const walk = (dir) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (!/_probe/.test(f)) walk(p);
      continue;
    }
    if (!f.endsWith('.spec.js')) continue;
    let src = fs.readFileSync(p, 'utf8');
    let changed = false;
    // Find each top-level test( '<ID>: …' call (also test.fixme-free plain tests), last first so indexes stay valid.
    const calls = [...src.matchAll(/^([ \t]*)test\(\s*\n?\s*(['"`])([A-Z]+-\d\d-\w+)[:\s]/gm)].reverse();
    for (const m of calls) {
      const id = m[3];
      if (!improvements.has(id)) continue;
      const start = m.index;
      const end = callEnd(src, src.indexOf('(', start));
      if (end < 0) continue;
      removed.push(`${path.relative(ROOT, p).replace(/\\/g, '/')} ${id}`);
      if (apply) {
        // Also drop one blank line left behind.
        let s = start;
        if (src.slice(s - 2, s) === '\n\n') s -= 1;
        src = src.slice(0, s) + src.slice(end);
        changed = true;
      }
    }
    if (changed) fs.writeFileSync(p, src);
  }
};
walk(path.join(ROOT, 'tests'));
console.log(`${improvements.size} improvement cases; ${removed.length} tests ${apply ? 'removed' : 'found'}`);
for (const r of removed) console.log(' ', r);
