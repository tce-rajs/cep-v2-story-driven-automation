// Reads the scope markers in the user stories (CEPV2_Stories/NN_*.md). A case marked _(improvement: …)_ is kept in the
// stories and the workbook as a record but is not automated, so specs that build tests in a loop skip those cases.
const fs = require('fs');
const path = require('path');

const STORIES = path.join(__dirname, '..', 'CEPV2_Stories');
const improvements = new Set();
for (const file of fs.readdirSync(STORIES).filter((f) => /^\d\d_.+\.md$/.test(f)))
  for (const m of fs
    .readFileSync(path.join(STORIES, file), 'utf8')
    .matchAll(/^\d+\.\s+([A-Z]+-\d\d-\w+)\s+—.*_\(\s*improvement/gm))
    improvements.add(m[1]);

/** True when the case is a team-agreed improvement (recorded, not automated). */
const isImprovement = (id) => improvements.has(id);

module.exports = { isImprovement };
