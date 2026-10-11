// Puts the suggestions exported from report/TEST_CASES_REVIEW.html into the workbook's Review comments column
// (matched by test case ID; build-workbook.js keeps them on every rebuild) and saves the "How I use the application"
// text to report/review/USAGE_NOTES.md. node scripts/merge-review.js <cepv2-review-suggestions.json>
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/merge-review.js <cepv2-review-suggestions.json>');
  process.exit(1);
}
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'CEPV2_Stories', 'CEPV2_TestCases.xlsx');
const review = JSON.parse(fs.readFileSync(file, 'utf8'));

const wb = XLSX.readFile(OUT);
const sheet = wb.Sheets['CEP v2 Stories'];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
const idCol = rows[0].indexOf('Test case ID');
const cmCol = rows[0].indexOf('Review comments');
const rowOf = new Map(rows.map((r, i) => [String(r[idCol]), i]));

const unknown = [];
for (const { id, suggestion } of review.suggestions || []) {
  const i = rowOf.get(id);
  if (i === undefined) unknown.push(id);
  else sheet[XLSX.utils.encode_cell({ r: i, c: cmCol })] = { t: 's', v: suggestion };
}
XLSX.writeFile(wb, OUT);

if ((review.usage || '').trim()) {
  const dir = path.join(ROOT, 'report', 'review');
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(
    path.join(dir, 'USAGE_NOTES.md'),
    `## How the owner uses the application (${review.exported || new Date().toISOString()})\n\n${review.usage.trim()}\n\n`
  );
}
console.log(
  `${(review.suggestions || []).length - unknown.length} suggestions merged into the workbook` +
    (unknown.length ? `; unknown IDs: ${unknown.join(', ')}` : '')
);
