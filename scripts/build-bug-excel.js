// Builds the bug list to share with the team as Excel (BUG_LIST.xlsx): number, title, what happens.
// Same bugs and order as BUG_LIST.md (scripts/bugs.json, High first).
//   node scripts/build-bug-excel.js
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.join(__dirname, '..');
const bugs = require('./bugs.json');
const SEV = ['High', 'Medium', 'Low'];
const rows = [['No.', 'Bug', 'What happens']];
let n = 0;
for (const s of SEV) for (const b of bugs.filter((x) => x.severity === s)) rows.push([++n, b.title, b.description]);

const ws = XLSX.utils.aoa_to_sheet(rows);
ws['!cols'] = [{ wch: 5 }, { wch: 60 }, { wch: 110 }];
ws['!autofilter'] = { ref: `A1:C${rows.length}` };
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Bugs');
XLSX.writeFile(wb, path.join(ROOT, 'BUG_LIST.xlsx'));
console.log(`BUG_LIST.xlsx: ${n} bugs`);
