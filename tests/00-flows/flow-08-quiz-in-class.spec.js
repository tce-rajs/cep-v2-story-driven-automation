// FLOW-08 — A quiz in class
// Source: CEPV2_Stories/00_EndToEndFlows.md
// Data: 'quiz' (second account, Class 11A Accountancy 3.1, holds Quiz resources). The quiz is attempted in its normal
// attempt mode (the AIR card popup closes by itself). FLOW-08-08 makes its own quiz in Plan Mode with the Plan Mode
// account (PLAN_PIN, Class 12A Physics 1.1) and removes it again.

const { test, expect } = require('../../fixtures');
const { createQuiz, quizCardInTeach, removeQuiz, autoTitle, QUIZ_CLASS } = require('../10-plan-mode/plan-helpers');

const start = async (user) => {
  const r = await user.player.startQuiz();
  expect(r.cameraBlocked, 'the quiz is not blocked waiting for a camera').toBe(false);
  expect(r.reachedQuestion, 'the first question loads').toBe(true);
};
const ticked = (user) =>
  user.player.quizOptions.evaluateAll((els) =>
    els.map((e, i) => (e.querySelector('input:checked') ? i : -1)).filter((i) => i >= 0)
  );
const questionText = async (user) => ((await user.player.quizQuestion.innerText()) || '').replace(/\s+/g, ' ').trim();
const goTo = async (user, n) => {
  await user.player.quizQuestionNumbers.nth(n - 1).click({ force: true });
  await expect.poll(() => user.player.currentQuestionNumber(), { message: `on question ${n}` }).toBe(n);
};
/** Answer every question (first option, submitted) through to the end; returns the number of questions. */
const finishQuiz = async (user) => {
  const total = await user.player.quizQuestionNumbers.count();
  for (let q = 1; q <= Math.max(total, 1); q++) {
    await user.player.answerCurrentQuestion(0);
    if (q < total) {
      await user.player.quizNextQuestionBtn.or(user.player.quizNextControl).first().click({ force: true });
      await user.page.waitForTimeout(700);
    }
  }
  return total;
};

test.describe('FLOW-08 A quiz in class', () => {
  test.describe.configure({ timeout: 240000 });

  test.afterEach(async ({ app }) => {
    await app.player.closePlayer().catch(() => {});
  });

  test.describe('the class attempts a playlist quiz', () => {
    test.use({ classMap: 'quiz' });

    test(
      'FLOW-08-01: a quiz opens in the quiz player on the first question',
      { tag: ['@smoke', '@functional'] },
      async ({ user }) => {
        await start(user);
        await expect(user.player.quizRenderer, 'the quiz player').toBeVisible();
        expect(await user.player.currentQuestionNumber(), 'on question 1').toBe(1);
      }
    );

    test('FLOW-08-02: each question type can be answered and changed', { tag: ['@functional'] }, async ({ user }) => {
      await start(user);
      const total = await user.player.quizQuestionNumbers.count();
      for (let q = 1; q <= total; q++) {
        await goTo(user, q);
        const options = await user.player.quizOptions.count();
        expect(options, `question ${q} offers answers`).toBeGreaterThan(1);
        await user.player.quizOptions.nth(0).click({ force: true });
        await expect.poll(() => ticked(user), { message: `question ${q}: answered` }).toEqual([0]);
        await user.player.quizOptions.nth(1).click({ force: true });
        await expect.poll(() => ticked(user), { message: `question ${q}: the answer can be changed` }).toEqual([1]);
      }
    });

    test('FLOW-08-03: moving between questions keeps the answers', { tag: ['@functional'] }, async ({ user }) => {
      await start(user);
      const total = await user.player.quizQuestionNumbers.count();
      expect(total, 'set-up: a quiz with several questions').toBeGreaterThan(1);
      await user.player.quizOptions.nth(1).click({ force: true });
      await goTo(user, 2);
      await user.player.quizOptions.nth(0).click({ force: true });
      await goTo(user, 1);
      await expect.poll(() => ticked(user), { message: 'question 1 keeps its answer' }).toEqual([1]);
      await goTo(user, 2);
      await expect.poll(() => ticked(user), { message: 'question 2 keeps its answer' }).toEqual([0]);
    });

    test('FLOW-08-04: submitting shows the result screen', { tag: ['@smoke', '@functional'] }, async ({ user }) => {
      await start(user);
      await finishQuiz(user);
      await expect(
        user.player.quizCompleteMsg
          .or(user.player.quizRenderer.getByText(/score|result|\d+\s*(\/|out of)\s*\d+/i))
          .first(),
        'the result screen'
      ).toBeVisible({ timeout: 15000 });
    });

    test(
      'FLOW-08-05: the review shows each answer as right or wrong with the correct answer',
      { tag: ['@functional'] },
      async ({ user }) => {
        await start(user);
        const total = await finishQuiz(user);
        const review = user.page.getByRole('button', { name: /review|view answers|check answers/i }).first();
        if (await review.isVisible({ timeout: 3000 }).catch(() => false)) await review.click({ force: true });
        for (let q = 1; q <= total; q++) {
          await goTo(user, q);
          const right = await user.player.quizCorrectOptions.count();
          const wrong = await user.player.quizIncorrectOptions.count();
          expect(right + wrong, `question ${q}: the answer is marked right or wrong`).toBeGreaterThan(0);
          expect(right, `question ${q}: the correct answer is shown`).toBeGreaterThan(0);
        }
      }
    );

    test(
      'FLOW-08-06: submitting with unanswered questions warns the teacher first',
      { tag: ['@negative'] },
      async ({ user, page }) => {
        await start(user);
        const total = await user.player.quizQuestionNumbers.count();
        expect(total, 'set-up: a quiz with several questions').toBeGreaterThan(1);
        // Skip straight to the last question and answer only that one.
        await goTo(user, total);
        await user.player.answerCurrentQuestion(0);
        const finish = page
          .getByRole('button', { name: /finish|submit quiz|end quiz|done/i })
          .filter({ visible: true });
        if (await finish.count()) await finish.first().click({ force: true });
        await expect(
          page
            .getByText(/unanswered|not answered|not attempted|skipped|are you sure/i)
            .filter({ visible: true })
            .first(),
          'a warning that questions are unanswered'
        ).toBeVisible({ timeout: 10000 });
      }
    );

    test(
      'FLOW-08-07: closing the quiz half way and opening it again does not show the wrong state',
      { tag: ['@negative'] },
      async ({ user }) => {
        await start(user);
        const q1 = await questionText(user);
        await user.player.answerCurrentQuestion(0);
        await user.player.quizNextQuestionBtn.or(user.player.quizNextControl).first().click({ force: true });
        await user.player.closePlayer();
        await user.playlist.ensureDrawerVisible();
        await start(user);
        expect(await user.player.currentQuestionNumber(), 'opens again on question 1').toBe(1);
        expect(await questionText(user), 'with question 1 shown').toBe(q1);
        // Either a fresh attempt (nothing marked) or the answer given before -- never a mix (a mark with no answer).
        const marked =
          (await user.player.quizCorrectOptions.count()) + (await user.player.quizIncorrectOptions.count());
        const answered = (await ticked(user)).length;
        expect(marked === 0 || answered > 0, 'no right/wrong marks without an answer').toBe(true);
        expect(await user.player.quizCompleteMsg.isVisible(), 'not on the result screen').toBe(false);
      }
    );
  });

  test(
    'FLOW-08-08: a quiz made in Plan Mode opens and is attempted the same way',
    { tag: ['@functional'] },
    async ({ app }) => {
      test.skip(!process.env.PLAN_PIN, 'needs the Plan Mode account (PLAN_PIN in .env)');
      test.setTimeout(360000);
      const title = autoTitle();
      await app.guest.open();
      await app.signIn(process.env.PLAN_PIN);
      await app.nav.resetToClass(QUIZ_CLASS.grade, QUIZ_CLASS.division, QUIZ_CLASS.subject);
      await app.nav.goToChapterTopic(QUIZ_CLASS.chapter, QUIZ_CLASS.topic);
      const { switched } = await app.compass.switchToPlanningMode();
      expect(switched, 'set-up: Plan Mode opened').toBe(true);
      await app.page.waitForTimeout(5000);
      try {
        expect((await createQuiz(app, title)).ok(), 'set-up: the quiz is saved in Plan Mode').toBe(true);
        const card = await quizCardInTeach(app, title);
        await expect(card, 'the quiz is in the topic playlist').toHaveCount(1, { timeout: 20000 });
        await app.player.openResourceCard(card.first());
        await expect(app.player.quizQuestion, 'it opens on its first question').toBeVisible({ timeout: 30000 });
        expect(await app.player.currentQuestionNumber()).toBe(1);
        await app.player.answerCurrentQuestion(0);
        const marked = (await app.player.quizCorrectOptions.count()) + (await app.player.quizIncorrectOptions.count());
        expect(marked, 'and it is attempted the same way (the answer is marked)').toBeGreaterThan(0);
      } finally {
        await app.player.closePlayer().catch(() => {});
        await removeQuiz(app, title).catch(() => {});
      }
    }
  );
});
