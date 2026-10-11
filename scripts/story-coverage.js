// Coverage check of the user stories: for every story, how many cases are Core (positive, Negative, Regression) and
// how many are Deep (Edge, Interruption, Concurrency, Performance), and which stories have no negative case or no
// positive case. Writes report/STORY_COVERAGE.md.
// A case's suite comes from its prefix: "Edge:", "Interruption:", "Concurrency:", "Performance:" = Deep; a case marked
// _(improvement …)_ = Improvement; _(not supported / not applicable …)_ = Out of scope; "Cross-Mode:" or manual-only
// stories = Manual; everything else = Core.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'CEPV2_Stories');
const files = fs.readdirSync(DIR).filter((f) => /^\d\d_.+\.md$/.test(f));

const suiteOf = (text) => {
  if (/_\(\s*improvement/i.test(text)) return 'Improvement';
  if (/_\(\s*(not supported|not applicable)/i.test(text)) return 'Out of scope';
  if (/^(Edge|Interruption|Concurrency|Performance)\s*:/i.test(text)) return 'Deep';
  if (/^Cross-Mode\s*:/i.test(text)) return 'Manual';
  return 'Core';
};

const lines = [
  '# Story coverage',
  '',
  '| Module | Stories | Core | Deep | Manual | Improvement | Out of scope | Stories with no negative case |',
  '| --- | --- | --- | --- | --- | --- | --- | --- |',
];
const gaps = [];
for (const file of files) {
  const text = fs.readFileSync(path.join(DIR, file), 'utf8');
  const stories = text.split(/\n(?=### )/).filter((s) => s.startsWith('### '));
  const count = { Core: 0, Deep: 0, Manual: 0, Improvement: 0, 'Out of scope': 0 };
  const noNegative = [];
  for (const story of stories) {
    const id = (story.match(/^### ([A-Z]+-\d\d)/) || [])[1];
    const title = (story.match(/^### [^\n]*— ([^\n]*)/) || [])[1] || '';
    const cases = [...story.matchAll(/^\d+\.\s+[A-Z]+-\d\d-\w+\s+—\s+(.*)$/gm)].map((m) => m[1]);
    let negative = 0;
    let positive = 0;
    for (const c of cases) {
      const suite = suiteOf(c);
      count[suite]++;
      if (suite === 'Core') {
        if (/^Negative\s*:/i.test(c)) negative++;
        else positive++;
      }
    }
    if (cases.length && negative === 0) noNegative.push(id);
    if (cases.length && positive === 0) gaps.push(`${id} ${title}: no positive core case`);
    if (cases.length && negative === 0) gaps.push(`${id} ${title}: no negative case`);
  }
  lines.push(
    `| ${file.replace('.md', '')} | ${stories.length} | ${count.Core} | ${count.Deep} | ${count.Manual} | ${count.Improvement} | ${count['Out of scope']} | ${noNegative.length}${noNegative.length ? ` (${noNegative.join(', ')})` : ''} |`
  );
}
lines.push('', '## Gaps to fill', '', ...gaps.map((g) => `- ${g}`));
fs.writeFileSync(path.join(ROOT, 'report', 'stories', 'STORY_COVERAGE.md'), lines.join('\n') + '\n');
console.log(`stories checked; ${gaps.length} gaps -> report/STORY_COVERAGE.md`);
