// Phase 1 exploration — FLOW-17 AI Homework, end to end, in the desktop client. Not part of any suite (tools/exploration).
// Generates questions (real AI calls) but never assigns: nothing reaches students. Evidence goes to
// report/exploration/flow-17/ (screenshots + log.json).
const fs = require('fs');
const path = require('path');
const { test } = require('../../fixtures');

const OUT = path.join(__dirname, '..', '..', 'report', 'exploration', 'flow-17');
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const note = (step, data) => {
  log.push({ step, ...data });
  fs.writeFileSync(path.join(OUT, 'log.json'), JSON.stringify(log, null, 2));
};

test.use({ classMap: 'default' });
test.setTimeout(20 * 60 * 1000);

test('explore FLOW-17 AI Homework', async ({ user, page }) => {
  const h = user.aiHomework;
  const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(() => {});
  const step = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      note(name, { error: e.message.split('\n')[0] });
      await shot(`${name}-error`);
    }
  };
  /** Every generated question as the teacher sees it: text, options, and any answer marking. */
  const readQuestions = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-qa-id^="ai-homework-builder-"][data-qa-id*="-question-"]')].map((q) => ({
        id: q.getAttribute('data-qa-id'),
        text: q.innerText.replace(/\s+/g, ' ').trim().slice(0, 400),
        editable: !!q.querySelector('[contenteditable="true"], textarea, input[type="text"]'),
        marked: [...q.querySelectorAll('[class*="correct"], [class*="answer"], input:checked')].map((e) =>
          (e.innerText || e.className || '').toString().slice(0, 60)
        ),
      }))
    );
  const visibleIds = (prefix) =>
    page.evaluate(
      (p) =>
        [...document.querySelectorAll(`[data-qa-id^="${p}"]`)]
          .filter((e) => e.getBoundingClientRect().width > 0)
          .map((e) => `${e.getAttribute('data-qa-id')}|${(e.innerText || e.value || '').trim().slice(0, 50)}`),
      prefix
    );

  await step('A-open', async () => {
    await h.open(user.magnet);
    await page.waitForTimeout(1500);
    await shot('A-builder');
    note('A-open', {
      header: await page
        .getByText(/Class\s*\d+\s*\|/)
        .first()
        .innerText()
        .catch(() => '(no header)'),
      controls: await visibleIds('ai-homework-'),
      generateEnabled: await h.generateBtn.isEnabled().catch(() => null),
    });
  });

  await step('B-generate', async () => {
    await h.setHomeworkCount(5);
    const t0 = Date.now();
    await h.generate();
    await h.waitForMathRendered();
    await page.waitForTimeout(1500);
    await shot('B-generated');
    note('B-generate', { seconds: Math.round((Date.now() - t0) / 1000), questions: await readQuestions() });
    note('B-controls', { controls: await visibleIds('ai-homework-builder-') });
  });

  await step('C-assign-form', async () => {
    await h.goToAssign();
    await page.waitForTimeout(1500);
    await shot('C-assign-form');
    note('C-assign-form', {
      title: await h.assignTitleInput.inputValue().catch(() => ''),
      classes: await h.assignClassOptions.allInnerTexts().catch(() => []),
      ticked: await h.checkedClassCount().catch(() => null),
      due: await h.assignDueOptions.allInnerTexts().catch(() => []),
    });
    await h.assignPreviousBtn.click({ force: true });
    await page.waitForTimeout(1500);
    note('C-previous', { questionsAfterPrevious: (await readQuestions()).length });
  });

  // Reload with generated questions: kept, or warned about?
  await step('D-reload', async () => {
    await page.reload();
    await page.waitForTimeout(8000);
    await shot('D-after-reload');
    note('D-reload', { builderOpen: await h.isOpen(), questionsLeft: (await readQuestions()).length });
  });

  // Another subject through the chapter picker (formulas / a language subject), if offered
  await step('E-other-subject', async () => {
    if (!(await h.isOpen())) await h.open(user.magnet);
    await h.selectChapterBtn.click({ force: true });
    await page.waitForTimeout(1500);
    await h.topicsSubjectSelect.click({ force: true });
    await page.waitForTimeout(800);
    const subjects = await page
      .locator('.ng-option')
      .allInnerTexts()
      .catch(() => []);
    await shot('E-subjects');
    note('E-subjects', { subjects });
    await page.keyboard.press('Escape');
    await h.topicsCloseBtn.click({ force: true }).catch(() => {});
  });

  await h.closeAll().catch(() => {});
});
