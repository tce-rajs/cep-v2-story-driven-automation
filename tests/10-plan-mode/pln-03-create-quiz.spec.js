// PLN-03 — Create a quiz from the question bank
// Source: CEPV2_Stories/10_PlanMode.md
// Every quiz a test creates is titled "AutoTest quiz …" and removed from the Teach Mode Playlist at the end of the test.

const { test, expect } = require('../../fixtures');
const {
  BROWSER_ONLY,
  openPlanMode,
  startQuiz,
  createQuiz,
  quizCardInTeach,
  removeQuiz,
  autoTitle,
} = require('./plan-helpers');

test.describe('PLN-03 Create a quiz from the question bank', () => {
  test.skip(!process.env.RUN_IN_BROWSER, BROWSER_ONLY);
  test.describe.configure({ timeout: 300000 });

  test.beforeEach(async ({ app }) => {
    await openPlanMode(app);
  });

  test(
    'PLN-03-01: Create Quiz shows a checkbox on every question',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      await startQuiz(app, 0);
      expect(await app.plan.selectionCheckboxes.count(), 'one checkbox per question').toBe(
        await app.plan.questionTypeLabels.count()
      );
    }
  );

  test(
    'PLN-03-02: the Create Quiz counter shows how many questions are ticked',
    { tag: ['@functional'] },
    async ({ app }) => {
      await startQuiz(app, 2);
      expect(await app.plan.quizCount(), 'two ticked').toBe(2);
    }
  );

  test('PLN-03-03: unticking a question lowers the counter', { tag: ['@functional'] }, async ({ app }) => {
    await startQuiz(app, 2);
    await app.plan.selectionCheckboxes.nth(0).click({ force: true });
    expect(await app.plan.quizCount(), 'one left ticked').toBe(1);
  });

  test('PLN-03-04: a quiz cannot be started with no questions ticked', { tag: ['@negative'] }, async ({ app }) => {
    await startQuiz(app, 0);
    expect(await app.plan.quizCount(), 'set-up: nothing ticked').toBe(0);
    await app.plan.pressQuizBar();
    await expect(app.plan.quizTitleInput, 'no quiz form without questions').toBeHidden();
  });

  test('PLN-03-05: the quiz form shows the ticked questions', { tag: ['@functional'] }, async ({ app }) => {
    await startQuiz(app, 2);
    await app.plan.pressQuizBar();
    await expect(app.plan.quizTitleInput, 'set-up: the quiz form is open').toBeVisible({ timeout: 10000 });
    // The ticked questions are listed beside the form, each with its box still ticked; the bank behind is greyed out.
    const form = await app.plan.quizTitleInput.boundingBox();
    const tickedBeside = await app.page
      .locator('input[type=checkbox]:checked')
      .evaluateAll(
        (boxes, formLeft) =>
          boxes.filter((b) => b.getBoundingClientRect().width > 0 && b.getBoundingClientRect().x < formLeft).length,
        form.x
      );
    expect(tickedBeside, 'both ticked questions are listed').toBeGreaterThanOrEqual(2);
    await app.plan.quizCancelBtn.click();
  });

  test(
    'PLN-03-06: the quiz form is filled in with the current class and subject',
    { tag: ['@functional'] },
    async ({ app }) => {
      await startQuiz(app, 2);
      await app.plan.pressQuizBar();
      await expect(app.plan.quizGradeInput).toHaveValue(/Class 12\s*\|\s*Physics/);
      await app.plan.quizCancelBtn.click();
    }
  );

  test(
    'PLN-03-07: the quiz form is filled in with the current chapter and topic',
    { tag: ['@functional'] },
    async ({ app }) => {
      await startQuiz(app, 2);
      await app.plan.pressQuizBar();
      await expect(app.plan.quizChapterInput).toHaveValue(/Chapter 1\..*\|/);
      await app.plan.quizCancelBtn.click();
    }
  );

  test('PLN-03-08: Add Quiz does not create a quiz without a title', { tag: ['@negative'] }, async ({ app, page }) => {
    const posts = [];
    page.on('request', (r) => r.method() === 'POST' && /custom\/quiz/i.test(r.url()) && posts.push(r.url()));
    await startQuiz(app, 2);
    await app.plan.pressQuizBar();
    await expect(app.plan.quizTitleInput, 'set-up: the title is empty').toHaveValue('');
    await app.plan.addQuizBtn.click({ force: true });
    await page.waitForTimeout(3000);
    expect(posts, 'no quiz is created').toEqual([]);
    await app.plan.quizCancelBtn.click().catch(() => {});
  });

  test('PLN-03-09: Add Quiz creates the quiz (the server accepts it)', { tag: ['@functional'] }, async ({ app }) => {
    const title = autoTitle();
    try {
      const response = await createQuiz(app, title);
      expect(response.ok(), 'the create request succeeded').toBe(true);
    } finally {
      await removeQuiz(app, title);
    }
  });

  test(
    "PLN-03-10: a created quiz appears in that topic's Playlist in Teach Mode, under its title",
    { tag: ['@functional'] },
    async ({ app }) => {
      const title = autoTitle();
      try {
        await createQuiz(app, title);
        const card = await quizCardInTeach(app, title);
        await expect(card, 'the quiz card is in the Playlist').toHaveCount(1, { timeout: 20000 });
      } finally {
        await removeQuiz(app, title);
      }
    }
  );

  test(
    'PLN-03-11: a created quiz opens in Teach Mode with the questions that were ticked',
    { tag: ['@functional'] },
    async ({ app, page }) => {
      const title = autoTitle();
      // Tick two questions, open the quiz form and note the text of the ticked questions it lists.
      await startQuiz(app, 2);
      await app.plan.pressQuizBar();
      await expect(app.plan.quizTitleInput, 'set-up: the quiz form is open').toBeVisible({ timeout: 10000 });
      const ticked = [
        ...new Set(
          (
            // The checkbox sits beside .question-card, inside the card view that holds both.
            await page
              .locator('tce-qb-question-card-view')
              .filter({ has: page.locator('input[type=checkbox]:checked') })
              .locator('.questionData')
              .allInnerTexts()
          ).map((t) => t.replace(/\s+/g, ' ').trim())
        ),
      ];
      expect(ticked.length, 'set-up: the ticked questions are listed').toBeGreaterThan(0);
      await app.plan.quizTitleInput.fill(title);
      const created = page.waitForResponse((r) => r.request().method() === 'POST' && /custom\/quiz/i.test(r.url()), {
        timeout: 20000,
      });
      await app.plan.addQuizBtn.click();
      try {
        expect((await created).ok(), 'set-up: the quiz is created').toBe(true);
        const card = await quizCardInTeach(app, title);
        await expect(card, 'set-up: the quiz is in the Playlist').toHaveCount(1, { timeout: 20000 });
        await app.player.openResourceCard(card);
        await expect(app.player.quizQuestionNumbers.first(), 'the quiz opens').toBeVisible({ timeout: 30000 });
        expect(await app.player.quizQuestionNumbers.count(), 'two questions, as ticked').toBe(2);
        // Walk the quiz with its "next" control and collect the question shown each time.
        const shown = [];
        for (let q = 0; q < 2; q++) {
          if (q) await app.player.quizNextControl.click({ force: true });
          await page.waitForTimeout(1500);
          const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
          shown.push(...ticked.filter((t) => body.includes(t)));
        }
        expect([...new Set(shown)].sort(), 'the quiz shows the ticked questions').toEqual([...ticked].sort());
      } finally {
        await app.player.closePlayer().catch(() => {});
        await removeQuiz(app, title);
      }
    }
  );

  test('PLN-03-12: Cancel on the quiz form creates nothing', { tag: ['@negative'] }, async ({ app, page }) => {
    const posts = [];
    page.on('request', (r) => r.method() === 'POST' && /custom\/quiz/i.test(r.url()) && posts.push(r.url()));
    await startQuiz(app, 2);
    await app.plan.pressQuizBar();
    await app.plan.quizTitleInput.fill(autoTitle());
    await app.plan.quizCancelBtn.click();
    await expect(app.plan.quizTitleInput, 'the form closed').toBeHidden({ timeout: 5000 });
    expect(posts, 'no quiz is created').toEqual([]);
  });

  test(
    'PLN-03-13: a quiz made in Plan Mode can be removed from the Playlist',
    { tag: ['@functional'] },
    async ({ app }) => {
      const title = autoTitle();
      await createQuiz(app, title);
      await removeQuiz(app, title);
      await app.page.reload();
      await app.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
      const card = await quizCardInTeach(app, title);
      await expect(card, 'the quiz is gone').toHaveCount(0, { timeout: 15000 });
    }
  );

  test(
    'PLN-03-14: a success message confirms the quiz was created',
    { tag: ['@functional'] },
    async ({ app, page }) => {
      const title = autoTitle();
      try {
        await createQuiz(app, title);
        await expect(
          page
            .getByText(/success|created|added|saved/i)
            .filter({ visible: true })
            .first(),
          'a success message'
        ).toBeVisible({ timeout: 8000 });
      } finally {
        await removeQuiz(app, title);
      }
    }
  );
});
