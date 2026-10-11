// Case IDs that failed in one or more Playwright JSON reports, split into N --grep groups (one per line).
// node scripts/failed-tests.js <groups> <report.json> [more.json …]
const fs = require('fs');

const [groups, ...files] = process.argv.slice(2);
const failed = new Set();
const walk = (suite) => {
  for (const spec of suite.specs || [])
    for (const t of spec.tests || [])
      if ((t.results || []).some((r) => r.status === 'failed' || r.status === 'timedOut')) {
        const id = (spec.title.match(/^([A-Z]+-\d\d-\w+)/) || [])[1];
        if (id) failed.add(id);
      }
  for (const child of suite.suites || []) walk(child);
};
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const raw = fs.readFileSync(f, 'utf8');
  for (const s of JSON.parse(raw.slice(raw.search(/^\{\s*$/m))).suites || []) walk(s);
}
const ids = [...failed];
const n = Number(groups);
for (let g = 0; g < n; g++) console.log(ids.filter((_, i) => i % n === g).map((id) => `${id}:`).join('|'));
console.error(`${ids.length} failed case IDs`);
