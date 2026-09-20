// PLR-02 — Review quiz results
// Source: CEPV2_Stories/11_Players.md

const { test, expect } = require('../../fixtures');

test.describe('PLR-02 Review quiz results', () => {
  test.use({ classMap: 'quiz' });

  const started = async (user) => {
    const result = await user.player.startQuiz();
    expect(result.cameraBlocked, 'the quiz was blocked waiting for a camera').toBe(false);
    expect(result.reachedQuestion, 'the first question loaded').toBe(true);
  };

  /** Answer every question in turn (first option each time) until the quiz is finished. */
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
  // Scoped to the quiz itself: the whole page also shows the toolbar's "100%" zoom label, which is not a score.
  const scoreText = (user) =>
    user.player.quizRenderer
      .getByText(/score|\b\d+\s*(\/|out of)\s*\d+\b|\b\d+\s*%/i)
      .filter({ visible: true })
      .first();

  test(
    'PLR-02-01: the score displays correctly immediately after submitting',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (v 0.0.223, screenshot-verified): finishing the quiz shows "Quiz Complete!" and marks
      // each option Correct / Incorrect, with the question numbers colour-coded -- but no score anywhere (the only score-like
      // text on the page is the toolbar's "100%" zoom label, which is what made this look like a pass before). Tracked as
      // expected-to-fail so it isn't masked; whether a numeric score is wanted needs a product decision.
      test.fail(true, 'Finishing the quiz shows "Quiz Complete!" and per-answer marks but no score');
      await started(user);
      const total = await finishQuiz(user);

      await expect(scoreText(user), 'a score is shown right after the last submission').toBeVisible({ timeout: 10000 });
      const text = ((await scoreText(user).innerText()) || '').replace(/\s+/g, ' ');
      test.info().annotations.push({ type: 'note', description: `Score text: "${text}" (${total} questions)` });
      const outOf = text.match(/(\d+)\s*(?:\/|out of)\s*(\d+)/i);
      if (outOf) {
        expect(Number(outOf[2]), 'the score is out of the number of questions').toBe(total);
        expect(Number(outOf[1])).toBeLessThanOrEqual(total);
      }
    }
  );

  test(
    'PLR-02-02: reviewing the quiz shows which specific answers were right or wrong',
    { tag: ['@functional'] },
    async ({ user }) => {
      await started(user);
      await finishQuiz(user);

      // Open the review (whatever the control is called), then look at a question.
      const review = user.page.getByRole('button', { name: /review|view answers|check answers/i }).first();
      if (await review.isVisible({ timeout: 3000 }).catch(() => false)) await review.click({ force: true });
      await user.page.waitForTimeout(1500);

      const right = await user.player.quizCorrectOptions.count();
      const wrong = await user.player.quizIncorrectOptions.count();
      test.info().annotations.push({
        type: 'note',
        description: `On the reviewed question: ${right} correct-marked, ${wrong} incorrect-marked`,
      });
      expect(right + wrong, 'answers are marked right or wrong').toBeGreaterThan(0);
    }
  );

  test(
    'PLR-02-03: attempting to review results before submitting the quiz is not accessible or shows an appropriate message',
    { tag: ['@negative'] },
    async ({ user }) => {
      await started(user);
      // Nothing answered or submitted yet.
      const review = user.page
        .getByRole('button', { name: /review|results|view answers|score/i })
        .filter({ visible: true })
        .first();
      const reachable =
        (await review.isVisible({ timeout: 2000 }).catch(() => false)) &&
        !(await review.isDisabled().catch(() => false));

      if (reachable) {
        await review.click({ force: true });
        await user.page.waitForTimeout(1500);
        await expect(
          user.page.getByText(/submit|not (available|yet)|complete the quiz|no results/i).first(),
          'if it can be reached, it explains there is nothing to review yet'
        ).toBeVisible();
      }
      // Either way, no score can be showing before anything was submitted.
      await expect(scoreText(user)).toBeHidden();
    }
  );
});
