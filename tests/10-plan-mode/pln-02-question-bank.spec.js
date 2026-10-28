// PLN-02 — Question Bank
// Source: CEPV2_Stories/10_PlanMode.md

const { test, expect } = require('../../fixtures');
const { openPlanMode } = require('./plan-helpers');

test.describe('PLN-02 Question Bank', () => {
  test.beforeEach(async ({ app }) => {
    await openPlanMode(app);
    await app.plan.openSection('Question Bank');
    await expect(app.plan.questionTypeLabels.first(), 'set-up: the bank lists questions').toBeVisible({
      timeout: 15000,
    });
  });

  test(
    'PLN-02-01: the Question Bank lists questions for the current chapter and topic',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      expect(await app.plan.questionTypeLabels.count(), 'questions are listed').toBeGreaterThan(0);
      await expect(app.plan.chapterSelect, 'the current chapter').toContainText(/Chapter 1/);
    }
  );

  test('PLN-02-02: each question card shows its question type', { tag: ['@functional'] }, async ({ app }) => {
    const types = await app.plan.questionTypeLabels.allInnerTexts();
    // The label reads "CUSTOM:<TYPE>", with the type on its own line.
    for (const t of types) expect(t.replace(/\s+/g, ''), 'a question type').toMatch(/^CUSTOM:?\w*/);
  });

  test(
    'PLN-02-03: each question card shows its class, chapter and topic',
    { tag: ['@functional'] },
    async ({ page }) => {
      const lines = await page
        .getByText(/^Class \d+\s*•?\s*Chapter/)
        .filter({ visible: true })
        .allInnerTexts();
      expect(lines.length, 'every card names its class and chapter').toBeGreaterThan(0);
    }
  );

  test(
    'PLN-02-04: choosing another topic changes the questions listed',
    { tag: ['@functional'] },
    async ({ app, page }) => {
      const before = await page.locator('body').innerText();
      const options = await app.plan.topicSelect.evaluate((s) => [...s.options].map((o) => o.text));
      await app.plan.choose(app.plan.topicSelect, options[options.length > 2 ? 2 : 1]);
      await page.waitForTimeout(2000);
      await expect(page.locator('body'), 'a different list').not.toHaveText(before);
    }
  );

  test(
    'PLN-02-05: the Question Bank offers Create Question, Create Quiz and Create Revision Test',
    { tag: ['@functional'] },
    async ({ app }) => {
      await expect(app.plan.createQuestionBtn, 'Create Question').toBeVisible();
      await expect(app.plan.createQuizBtn, 'Create Quiz').toBeVisible();
      await expect(app.plan.createRevisionTestBtn, 'Create Revision Test').toBeVisible();
    }
  );

  test(
    'PLN-02-06: a topic with no questions shows a message, not a blank Question Bank',
    { tag: ['@negative'] },
    async ({ app, page }) => {
      // Walk the first chapters' topics until one lists no question (the book has custom chapters with empty topics).
      let empty = null;
      const chapters = (await app.plan.optionsOf(app.plan.chapterSelect)).slice(1, 6);
      for (const chapter of chapters) {
        await app.plan.choose(app.plan.chapterSelect, chapter);
        for (const topic of (await app.plan.optionsOf(app.plan.topicSelect)).slice(1)) {
          await app.plan.choose(app.plan.topicSelect, topic);
          if (!(await app.plan.questionCards.count())) {
            empty = `${chapter} / ${topic}`;
            break;
          }
        }
        if (empty) break;
      }
      if (!empty)
        throw new Error('DATA MISSING ON THIS SERVER: no topic without questions in the first chapters of the bank');
      await expect(
        page
          .getByText(/no questions?|not found|no data|nothing to show/i)
          .filter({ visible: true })
          .first(),
        `a message for the empty topic ${empty}`
      ).toBeVisible({ timeout: 5000 });
    }
  );
});
