// Lists the case IDs a shard has not run yet, split into N groups, as --grep patterns (one per line).
// node scripts/remaining-tests.js <shard-list.json> <shard.log> <groups>
const fs = require('fs');

const [listFile, logFile, groups = '2'] = process.argv.slice(2);
const raw = fs.readFileSync(listFile, 'utf8');
// dotenv prints a banner before the JSON report: start at the first line that is just "{".
const list = JSON.parse(raw.slice(raw.search(/^\{\s*$/m)));
const titles = [];
const walk = (s) => {
  for (const spec of s.specs || []) titles.push(spec.title);
  for (const child of s.suites || []) walk(child);
};
for (const s of list.suites) walk(s);
const log = fs.readFileSync(logFile, 'utf8');
const ids = [...new Set(titles.map((t) => (t.match(/^([A-Z]+-\d\d-\w+)/) || [])[1]).filter(Boolean))];
const left = ids.filter((id) => !new RegExp(`› ${id}[:\\s]`).test(log));
const n = Number(groups);
for (let g = 0; g < n; g++) {
  const part = left.filter((_, i) => i % n === g);
  console.log(part.map((id) => `${id}:`).join('|'));
}
console.error(`${left.length} case IDs left of ${ids.length}`);
