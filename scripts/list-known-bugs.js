// Lists every test.fail(true, reason) confirmed bug in the suite, with its test ID/title, as a markdown table.
const fs = require('fs');
const path = require('path');

const testsDir = path.join(__dirname, '..', 'tests');
const rows = [];

function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.spec.js')) scanFile(p);
  }
}

function scanFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  // Find each test( 'ID: title', ... ) block, then look inside it for test.fail(true, 'reason').
  const testRe = /test\(\s*(?:\/\/[^\n]*\n\s*)*['"`]([\s\S]*?)['"`]\s*,/g;
  let m;
  const starts = [];
  while ((m = testRe.exec(src))) starts.push({ idx: m.index, title: m[1].replace(/\s+/g, ' ').trim() });

  for (let i = 0; i < starts.length; i++) {
    const start = starts[i].idx;
    const end = i + 1 < starts.length ? starts[i + 1].idx : src.length;
    const block = src.slice(start, end);
    const failRe = /test\.fail\(\s*true\s*,\s*(['"`])((?:\\.|(?!\1).)*)\1/;
    const fm = block.match(failRe);
    if (fm) {
      const idMatch = starts[i].title.match(/^([A-Z]+-[\w-]*\d[\w-]*)/);
      rows.push({
        id: idMatch ? idMatch[1] : '(no ID)',
        title: starts[i].title,
        reason: fm[2].replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim(),
        file: path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/'),
      });
    }
  }
}

walk(testsDir);
rows.sort((a, b) => a.id.localeCompare(b.id));

console.log(`| # | ID | Bug |`);
console.log(`| --- | --- | --- |`);
rows.forEach((r, i) => {
  console.log(`| ${i + 1} | ${r.id} | ${r.reason} |`);
});
console.log(`\nTotal: ${rows.length}`);
