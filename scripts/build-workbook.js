// Rebuilds CEPV2_Stories/CEPV2_TestCases.xlsx (the reviewer workbook) from the story files, one row per test case.
// Review comments already typed into the workbook are kept (matched by test case ID).
//   node scripts/build-workbook.js
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DIR = path.join(__dirname, '..', 'CEPV2_Stories');
const OUT = path.join(DIR, 'CEPV2_TestCases.xlsx');
const HEADER = ['Module No.', 'Module', 'Story ID', 'Story', 'Test case ID', 'Test case', 'Review comments'];

const comments = new Map();
if (fs.existsSync(OUT)) {
  const rows = XLSX.utils.sheet_to_json(XLSX.readFile(OUT).Sheets['CEP v2 Stories'], { header: 1 });
  for (const r of rows.slice(1)) if (r[4] && r[6]) comments.set(String(r[4]), r[6]);
}

const rows = [HEADER];
const files = fs
  .readdirSync(DIR)
  .filter((f) => /^\d\d_.+\.md$/.test(f))
  .sort();
for (const file of files) {
  const [, no, rawName] = file.match(/^(\d\d)_(.+)\.md$/);
  const moduleName = rawName
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^AI(?=[A-Z])/, 'AI ');
  let storyId = '';
  let story = '';
  for (const line of fs.readFileSync(path.join(DIR, file), 'utf8').split(/\r?\n/)) {
    const h = line.match(/^###\s+([A-Z]+-\d+)\s+[—-]\s+(.+?)\s*(\(added [^)]*\))?\s*$/);
    if (h) {
      storyId = h[1];
      story = h[2];
      continue;
    }
    const c = line.match(/^\d+\.\s+([A-Z]+-\d+-[\w]+)\s+[—-]\s+(.+)$/);
    if (c && storyId)
      rows.push([no, moduleName, storyId, story, c[1], c[2].replace(/\*\*/g, ''), comments.get(c[1]) || '']);
  }
}

const ws = XLSX.utils.aoa_to_sheet(rows);
ws['!cols'] = [{ wch: 8 }, { wch: 18 }, { wch: 10 }, { wch: 40 }, { wch: 14 }, { wch: 100 }, { wch: 30 }];
ws['!autofilter'] = { ref: `A1:G${rows.length}` };
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'CEP v2 Stories');
XLSX.writeFile(wb, OUT);
console.log(`${rows.length - 1} test cases -> ${path.relative(process.cwd(), OUT)}`);
