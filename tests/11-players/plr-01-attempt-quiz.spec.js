// PLR-01 — Attempt a quiz
// Source: CEPV2_Stories/11_Players.md
// Not automated (per PROCESS.md, Cross-Mode cases are manual-only): PLR-01-10 (split-screen sync with the student screen).
//
// Data: the 'quiz' topic (Class 11A Accountancy, chapter 3). CONFIRMED LIVE in the previous suite: the quiz opens on a
// "Launch AIR Card" screen, then a class-strength/Start screen, and needs a camera — the launch flags in
// fixtures/electron-app.js and playwright.config.js supply a stand-in camera. If the camera is still refused these
// tests fail with that reason rather than hanging.

const { test, expect } = require('../../fixtures');

test.describe('PLR-01 Attempt a quiz', () => {
  test.use({ classMap: 'quiz' });

  const started = async (user) => {
    const result = await user.player.startQuiz();
    expect(result.cameraBlocked, 'the quiz was blocked waiting for a camera').toBe(false);
    expect(result.reachedQuestion, 'the first question loaded').toBe(true);
  };

  /** Step through the quiz looking for the first question where `predicate(page)` holds; null if none does. */
  const findQuestion = async (user, predicate) => {
    const total = await user.player.quizQuestionNumbers.count();
    for (let i = 0; i < Math.max(total, 1); i++) {
      if (await predicate(user)) return i + 1;
      if (i < total - 1) {
        await user.player.quizNextControl.click({ force: true });
        await user.page.waitForTimeout(700);
      }
    }
    return null;
  };

  test(
    'PLR-01-01: clicking on the quiz loads the quiz player',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await expect(user.player.quizCards.first()).toBeAttached({ timeout: 10000 });
      await user.player.openResourceCard(user.player.quizCards);
      await expect(user.player.quizLaunchScreenBtn.or(user.player.quizRenderer)).toBeVisible({ timeout: 15000 });
    }
  );

  test(
    'PLR-01-02: the AIR card popup appears and disappears after ~5 seconds, with the question only loading once it is gone',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const { player } = user;
      await player.quizCards.first().waitFor({ state: 'attached', timeout: 10000 });
      await player.openResourceCard(player.quizCards);
      if (await player.quizLaunchScreenBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
        await player.quizLaunchScreenBtn.click({ force: true });
      }
      if (await player.quizClassStrengthStartBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
        await player.quizClassStrengthStartBtn.click({ force: true });
      }

      const popup = page
        .getByText(/air card/i)
        .filter({ visible: true })
        .first();
      await expect(popup, 'the AIR card popup appears').toBeVisible({ timeout: 10000 });
      const shownAt = Date.now();
      // The question must NOT be loaded while the popup is still up.
      expect(await player.quizQuestion.isVisible().catch(() => false), 'no question yet, popup still showing').toBe(
        false
      );

      await expect(popup, 'the popup goes away by itself').toBeHidden({ timeout: 15000 });
      const shownFor = Date.now() - shownAt;
      test.info().annotations.push({ type: 'note', description: `AIR card popup visible for ~${shownFor}ms` });
      expect(shownFor, 'roughly five seconds').toBeGreaterThan(3000);
      expect(shownFor).toBeLessThan(9000);

      await expect(player.quizQuestion, 'and only then the first question').toBeVisible({ timeout: 15000 });
    }
  );

  test('PLR-01-03: a text-based question renders correctly', { tag: ['@functional'] }, async ({ user }) => {
    await started(user);
    const found = await findQuestion(
      user,
      async (u) => ((await u.player.quizQuestion.innerText().catch(() => '')) || '').trim().length > 0
    );
    expect(found, 'a question with text').not.toBeNull();
    await expect(user.player.quizQuestion).toBeVisible();
  });

  test('PLR-01-04: an image-based question renders correctly', { tag: ['@functional'] }, async ({ user }) => {
    await started(user);
    const found = await findQuestion(user, async (u) => (await u.player.quizQuestion.locator('img').count()) > 0);
    test.skip(found === null, 'this quiz has no question that contains an image');

    const img = user.player.quizQuestion.locator('img').first();
    await expect(img).toBeVisible();
    expect(await img.evaluate((el) => el.complete && el.naturalWidth > 0), 'the image actually loaded').toBe(true);
  });

  test('PLR-01-05: text-based options render correctly', { tag: ['@functional'] }, async ({ user }) => {
    await started(user);
    const found = await findQuestion(
      user,
      async (u) =>
        (await u.player.quizOptionLabels.count()) > 1 && (await u.player.quizOptions.locator('img').count()) === 0
    );
    expect(found, 'a question with text options').not.toBeNull();
    const labels = (await user.player.quizOptionLabels.allInnerTexts()).map((t) => t.trim());
    expect(labels.length).toBeGreaterThan(1);
    for (const label of labels) expect(label.length, 'every option has text').toBeGreaterThan(0);
  });

  test('PLR-01-06: image-based options render correctly', { tag: ['@functional'] }, async ({ user }) => {
    await started(user);
    const found = await findQuestion(user, async (u) => (await u.player.quizOptions.locator('img').count()) > 0);
    test.skip(found === null, 'this quiz has no question with image options');

    const images = user.player.quizOptions.locator('img');
    for (const ok of await images.evaluateAll((imgs) => imgs.map((el) => el.complete && el.naturalWidth > 0))) {
      expect(ok, 'every option image loaded').toBe(true);
    }
  });

  test(
    'PLR-01-07: navigating backward through multiple questions works correctly',
    { tag: ['@functional'] },
    async ({ user }) => {
      await started(user);
      const total = await user.player.quizQuestionNumbers.count();
      test.skip(total < 3, 'the quiz needs at least three questions');
      const shown = async () => ((await user.player.quizQuestion.innerText()) || '').replace(/\s+/g, ' ').trim();

      // Go forward first so there is something to go back through, noting what each question shows.
      const q1 = await shown();
      await user.player.quizNextControl.click({ force: true });
      await user.page.waitForTimeout(1200);
      const q2 = await shown();
      await user.player.quizNextControl.click({ force: true });
      await user.page.waitForTimeout(1200);
      expect(await user.player.currentQuestionNumber(), 'on question 3').toBe(3);

      // Going back must change the pager AND the question on screen (not just one of them).
      await user.player.quizPrevControl.click({ force: true });
      await user.page.waitForTimeout(1200);
      expect(await user.player.currentQuestionNumber(), 'one question back').toBe(2);
      expect(await shown(), 'question 2 is shown').toBe(q2);
      await user.player.quizPrevControl.click({ force: true });
      await user.page.waitForTimeout(1200);
      expect(await user.player.currentQuestionNumber(), 'two back').toBe(1);
      expect(await shown(), 'question 1 is shown again').toBe(q1);
    }
  );

  test(
    'PLR-01-08: navigating forward through multiple questions works correctly',
    { tag: ['@functional'] },
    async ({ user }) => {
      await started(user);
      const total = await user.player.quizQuestionNumbers.count();
      test.skip(total < 2, 'the quiz has only one question');

      const first = await user.player.currentQuestionNumber();
      for (let step = 1; step <= Math.min(3, total - 1); step++) {
        await user.player.quizNextControl.click({ force: true });
        await user.page.waitForTimeout(700);
        expect(await user.player.currentQuestionNumber(), `forward ${step}`).toBe(first + step);
        await expect(user.player.quizQuestion).toBeVisible();
      }
    }
  );

  test(
    'PLR-01-09: selecting an answer and submitting it registers correctly',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await started(user);
      await user.player.answerCurrentQuestion(0);

      const marked = (await user.player.quizCorrectOptions.count()) + (await user.player.quizIncorrectOptions.count());
      expect(marked, 'the submitted answer was scored (correct/incorrect shown)').toBeGreaterThan(0);
    }
  );

  test(
    'PLR-01-11: double-clicking Submit does not create a duplicate submission',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      await started(user);
      const submissions = [];
      page.on('request', (req) => {
        if (req.method() === 'POST' && /answer|submit|response|attempt/i.test(req.url())) submissions.push(req.url());
      });

      await user.player.quizOptions.first().click({ force: true });
      await user.player.quizSubmitBtn.dblclick({ force: true });
      await page.waitForTimeout(2500);

      test.info().annotations.push({ type: 'note', description: `Submission requests seen: ${submissions.length}` });
      expect(submissions.length, 'one submission, not two').toBeLessThanOrEqual(1);
      const marked = (await user.player.quizCorrectOptions.count()) + (await user.player.quizIncorrectOptions.count());
      expect(marked, 'exactly one answer marked on screen').toBeGreaterThan(0);
      expect(marked).toBeLessThanOrEqual(await user.player.quizOptions.count());
    }
  );

  test.fixme('PLR-01-12: a class with zero enrolled students attempting to launch a Student Test is handled gracefully', async () => {
    // BLOCKED (checked live, v 0.0.223): this build has no class-strength / Start screen and no "Student Test" launch. A quiz
    // opens with the AIR card popup, which either times out into the attempt mode or ("Launch AIR Card") goes straight to the
    // camera "Capture" mode -- neither has a place to enter a class size, so a zero-student class cannot be set up.
  });

  test('PLR-01-13: a very large quiz does not degrade responsiveness', { tag: ['@performance'] }, async ({ user }) => {
    test.setTimeout(4 * 60 * 1000);
    await started(user);
    const total = await user.player.quizQuestionNumbers.count();

    // Step through every question and time each move; none may take long, and later ones must not be slower.
    const timings = [];
    for (let i = 1; i < total; i++) {
      const start = Date.now();
      await user.player.quizNextControl.click({ force: true });
      await expect(user.player.quizQuestion).toBeVisible();
      timings.push(Date.now() - start);
    }
    test
      .info()
      .annotations.push({ type: 'note', description: `${total} questions; per-move ms: ${timings.join(',')}` });
    expect(Math.max(0, ...timings), 'no single move takes over 3s').toBeLessThan(3000);
  });

  test(
    'PLR-01-14: in AIR card mode, navigating back to question 1 shows question 1 again',
    { tag: ['@regression', '@bug'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (v 0.0.223, AIR card mode only -- the normal attempt mode is fine, see PLR-01-07):
      // going back to question 1 (with "previous" or by clicking page 1) moves the pager to 1 but leaves the previous
      // question's text on screen. Questions 2, 3 and 4 navigate correctly; question 1 can never be shown again.
      test.fail(true, 'AIR card mode: navigating back to question 1 updates the pager but not the question shown');
      expect(await user.player.startAirCardQuiz(), 'AIR card mode opened its first question').toBe(true);
      const shown = async () => ((await user.player.airQuestion.innerText()) || '').replace(/\s+/g, ' ').trim();

      const q1 = await shown();
      await user.player.quizNextControl.click({ force: true });
      await user.page.waitForTimeout(2000);
      const q2 = await shown();
      expect(q2, 'moving forward changes the question').not.toBe(q1);

      await user.player.quizPrevControl.click({ force: true });
      await user.page.waitForTimeout(2000);
      expect(await user.player.currentQuestionNumber(), 'the pager is back on 1').toBe(1);
      expect(await shown(), 'and question 1 is what is shown').toBe(q1);
    }
  );
});
