// Phase 1 exploration — FLOW-17 AI Homework, second pass: can the builder generate in EVERY class the teacher teaches?
// Then a full generate → review → assign form → Previous → reload on a class where it works. Never assigns.
// Only switches classes and opens the builder; nothing is written on any board. Evidence: report/exploration/flow-17/.
const fs = require('fs');
const path = require('path');
const { test } = require('../../fixtures');

const OUT = path.join(__dirname, '..', '..', 'report', 'exploration', 'flow-17');
const LOG = path.join(OUT, 'log-b.json');
const log = [];
const note = (step, data) => {
  log.push({ step, ...data });
  fs.writeFileSync(LOG, JSON.stringify(log, null, 2));
};

// The teacher's classes, from Recent Classes (raj.shinde, 9 Oct).
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
];

test.use({ classMap: 'default' });
test.setTimeout(30 * 60 * 1000);

test('explore FLOW-17 AI Homework, every class', async ({ user, page }) => {
  const h = user.aiHomework;
  const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(() => {});
  const step = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      note(name, { error: e.message.split('\n')[0] });
      await shot(`${name}-error`);
      await h.closeAll().catch(() => {});
    }
  };
  const readQuestions = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-qa-id^="ai-homework-builder-"][data-qa-id*="-question-"]')].map((q) =>
        q.innerText.replace(/\s+/g, ' ').trim().slice(0, 300)
      )
    );

  for (const [grade, division, subject] of CLASSES) {
    const key = `${grade} ${division} ${subject}`.replace(/\s+/g, '-');
    await step(`A-${key}`, async () => {
      await user.nav.resetToClass(grade, division, subject);
      await page.waitForTimeout(2000);
      await h.open(user.magnet);
      await page.waitForTimeout(3000);
      const header = await page
        .getByText(/Class\s*\d+\s*\|/)
        .first()
        .innerText()
        .catch(() => '');
      const blocked = await h.wrongSubjectBanner.isVisible().catch(() => false);
      await shot(`A-${key}`);
      note(`A-${key}`, {
        header: header.replace(/\s+/g, ' '),
        blockedMessage: blocked,
        generateEnabled: await h.generateBtn.isEnabled().catch(() => null),
      });
      await h.closeAll();
      await page.waitForTimeout(1000);
    });
  }

  // Full path on 10 A Science (the class the automated suite uses)
  await step('B-generate', async () => {
    await user.nav.resetToClass('Class 10', 'A', 'Science');
    await page.waitForTimeout(2000);
    await h.open(user.magnet);
    await page.waitForTimeout(2000);
    await h.setHomeworkCount(5);
    const t0 = Date.now();
    await h.generate();
    await h.waitForMathRendered();
    await page.waitForTimeout(1500);
    await shot('B-generated');
    note('B-generate', {
      header: (await page.getByText(/Class\s*\d+\s*\|/).first().innerText()).replace(/\s+/g, ' '),
      seconds: Math.round((Date.now() - t0) / 1000),
      questions: await readQuestions(),
    });
  });

  await step('C-assign-form', async () => {
    await h.goToAssign();
    await page.waitForTimeout(1500);
    await shot('C-assign-form');
    note('C-assign-form', {
      title: await h.assignTitleInput.inputValue(),
      classes: await h.assignClassOptions.allInnerTexts(),
      ticked: await h.assignClassCheckboxes.evaluateAll((els) => els.map((e) => e.checked)),
      due: await h.assignDueOptions.allInnerTexts(),
    });
    await h.assignPreviousBtn.click({ force: true });
    await page.waitForTimeout(1500);
    note('C-previous', { questionsAfterPrevious: (await readQuestions()).length });
  });

  await step('D-reload', async () => {
    await page.reload();
    await page.waitForTimeout(8000);
    await shot('D-after-reload');
    note('D-reload', { builderOpen: await h.isOpen(), questionsLeft: (await readQuestions()).length });
  });

  await h.closeAll().catch(() => {});
});
