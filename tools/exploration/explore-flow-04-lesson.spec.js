// Phase 1 exploration — FLOW-04 getting to the lesson, in EVERY class the teacher teaches. Read-only.
// Per class: chapters listed (names, numbering), the current chapter's topics, a lesson plan per topic, playlist cards.
// Evidence: report/exploration/flow-04/.
const fs = require('fs');
const path = require('path');
const { test } = require('../../fixtures');

const OUT = path.join(__dirname, '..', '..', 'report', 'exploration', 'flow-04');
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const note = (step, data) => {
  log.push({ step, ...data });
  fs.writeFileSync(path.join(OUT, 'log.json'), JSON.stringify(log, null, 2));
};

const CLASSES = [
  ['Class 9', 'A', 'Science'],
  ['Class 10', 'A', 'Science'],
  ['Class 12', 'A', 'Computer Science'],
  ['Class 12', 'A', 'Physics'],
  ['Class 5', 'A', 'Mathematics'],
  ['Class 10', 'A', 'Mathematics'],
  ['Class 11', 'A', 'Mathematics'],
  ['Class 10', 'A', 'Sanskrit Literature'],
  ['Class 10', 'A', 'Political Science'],
  ['Class 10', 'A', 'Science Practicals'],
];

test.use({ classMap: 'default' });
test.setTimeout(40 * 60 * 1000);

test('explore FLOW-04 every class', async ({ user, page }) => {
  const nav = user.nav;
  const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(() => {});
  for (const [grade, division, subject] of CLASSES) {
    const key = `${grade}-${division}-${subject}`.replace(/\s+/g, '-');
    try {
      const t0 = Date.now();
      await nav.resetToClass(grade, division, subject);
      const switchMs = Date.now() - t0;
      await page.waitForTimeout(2000);
      const topicBefore = (await nav.currentChapterTopicBtn.innerText().catch(() => '')).replace(/\s+/g, ' ');
      await nav.openChaptersPopup();
      await nav.chapterItems.first().waitFor({ state: 'visible', timeout: 15000 });
      await page.waitForTimeout(800);
      const chapters = (await nav.chapterItems.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
      const topics = (await nav.topicItems.allInnerTexts().catch(() => [])).map((t) => t.replace(/\s+/g, ' ').trim());
      const lessonPlans = await nav.lessonPlanBtns.count();
      await shot(`${key}-chapters`);
      // Numbering: the leading number of each chapter, to spot gaps, repeats and order problems.
      const nums = chapters.map((c) => Number((c.match(/^\D*?(\d+)/) || [])[1]));
      const outOfOrder = nums.some(
        (n, i) => i > 0 && !Number.isNaN(n) && !Number.isNaN(nums[i - 1]) && n < nums[i - 1]
      );
      const repeated = nums.filter((n, i) => !Number.isNaN(n) && nums.indexOf(n) !== i);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(800);
      note(key, {
        switchMs,
        topicBefore,
        chapterCount: chapters.length,
        chapters: chapters.slice(0, 40),
        outOfOrder,
        repeated,
        currentChapterTopics: topics.slice(0, 20),
        lessonPlanButtons: lessonPlans,
        playlistCards: (await user.playlist.cardTitles().catch(() => [])).length,
      });
    } catch (e) {
      note(key, { error: e.message.split('\n')[0] });
      await shot(`${key}-error`);
      await page.keyboard.press('Escape').catch(() => {});
    }
  }
});
