// PLN-06 — Create a question
// Source: CEPV2_Stories/10_PlanMode.md
// Plan Mode account, Class 12 Physics 1.1. The question form's default type, "Multiple Choice - Standard", is a
// single-choice question (saved as type SCQ). Every question a test saves is titled "AutoTest question …" and deleted
// again at the end of the test (card ⋮ -> Delete Question), so 12 Physics 1.1 keeps holding no single-choice question
// (PLN-04-01 relies on that).

const { test, expect } = require('../../fixtures');
const { BROWSER_ONLY, openPlanMode, autoName } = require('./plan-helpers');

const OPTIONS = ['Alpha', 'Beta', 'Gamma', 'Delta'];

test.describe('PLN-06 Create a question', () => {
  test.skip(!process.env.RUN_IN_BROWSER, BROWSER_ONLY);
  test.describe.configure({ timeout: 180000 });

  test.beforeEach(async ({ app }) => {
    await openPlanMode(app);
    await app.plan.openSection('Question Bank');
    await expect(app.plan.questionCards.first(), 'set-up: the bank lists questions').toBeVisible({ timeout: 15000 });
  });

  /** Delete a question a test saved (also one saved by mistake in a negative test). */
  const cleanUp = async (app, text, response) => {
    if (!response || !response.ok()) return;
    await app.page.reload();
    await app.page.waitForTimeout(5000);
    await app.plan.openSection('Question Bank');
    if (await app.plan.questionCardByText(text).count()) await app.plan.deleteQuestion(text);
  };

  test('PLN-06-01: Create Question opens the question form', { tag: ['@smoke', '@functional'] }, async ({ app }) => {
    await app.plan.openCreateQuestion();
    await expect(app.plan.questionTypeBtn, 'the question type').toBeVisible();
    expect(await app.plan.questionEditors.count(), 'a question box and an answer box').toBeGreaterThanOrEqual(2);
    await expect(app.plan.submitQuestionBtn, 'Submit Question').toBeVisible();
    await app.plan.questionFormCancelBtn.click();
  });

  test(
    'PLN-06-02: a single-choice question with four options and one answer can be saved',
    { tag: ['@functional'] },
    async ({ app }) => {
      const text = autoName('question');
      let saved = null;
      try {
        await app.plan.openCreateQuestion();
        await app.plan.fillQuestion({ text, options: OPTIONS, correct: 0 });
        saved = await app.plan.submitQuestion();
        expect(saved, 'the question is sent to the server').not.toBeNull();
        expect(saved.ok(), `the server accepts it (HTTP ${saved.status()})`).toBe(true);
        expect(JSON.parse(saved.request().postData() || '{}').questionType, 'saved as single-choice').toBe('SCQ');
      } finally {
        await cleanUp(app, text, saved);
      }
    }
  );

  test(
    'PLN-06-03: a saved question appears in the Question Bank for its chapter and topic',
    { tag: ['@functional'] },
    async ({ app }) => {
      const text = autoName('question');
      let saved = null;
      try {
        await app.plan.openCreateQuestion();
        await app.plan.fillQuestion({ text, options: OPTIONS, correct: 1 });
        saved = await app.plan.submitQuestion();
        expect(saved && saved.ok(), 'set-up: the question was saved').toBe(true);
        // Open the bank afresh on the same chapter and topic.
        await app.page.reload();
        await app.page.waitForTimeout(5000);
        await app.plan.openSection('Question Bank');
        const card = app.plan.questionCardByText(text);
        await expect(card, 'the question is in the bank').toHaveCount(1, { timeout: 15000 });
        await expect(card.first(), 'under its chapter').toContainText('Chapter 1.');
        await expect(card.first(), 'under its topic').toContainText('Big Idea');
      } finally {
        await cleanUp(app, text, saved);
      }
    }
  );

  test('PLN-06-04: a question without text cannot be saved', { tag: ['@negative'] }, async ({ app }) => {
    let saved = null;
    try {
      await app.plan.openCreateQuestion();
      await app.plan.fillQuestion({ options: OPTIONS, correct: 0 });
      saved = await app.plan.submitQuestion();
      expect(saved, 'nothing is saved').toBeNull();
    } finally {
      if (saved && saved.ok()) await cleanUp(app, OPTIONS[0], saved);
    }
  });

  test(
    'PLN-06-05: a single-choice question without a marked answer cannot be saved',
    { tag: ['@negative'] },
    async ({ app }) => {
      const text = autoName('question');
      let saved = null;
      try {
        await app.plan.openCreateQuestion();
        await app.plan.fillQuestion({ text, options: OPTIONS });
        saved = await app.plan.submitQuestion();
        expect(saved, 'nothing is saved').toBeNull();
      } finally {
        await cleanUp(app, text, saved);
      }
    }
  );
});
