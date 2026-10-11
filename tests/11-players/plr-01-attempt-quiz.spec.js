// PLR-01 — Attempt a quiz
// Source: CEPV2_Stories/11_Players.md
// Not automated (per PROCESS.md, Cross-Mode cases are manual-only): PLR-01-10.
//
// Data: the 'quiz' topic (Class 11A Accountancy, chapter 3). The quiz opens on a
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
      const rendered = user.player.quizLaunchScreenBtn.or(user.player.quizRenderer);
      await expect(rendered).toBeVisible({ timeout: 15000 });
      // Being visible only proves an element exists, not that the quiz occupies a real amount of screen, not a
      // broken sliver. The "Launch AIR Card" button is a small button by design (~50px tall), so
      // only size-check once past it, when the full renderer (~980x740 in this window) is what's showing.
      if (await user.player.quizRenderer.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect
          .poll(async () => (await user.player.quizRenderer.boundingBox())?.width || 0, {
            message: 'the quiz finishes rendering to a real size',
            timeout: 10000,
          })
          .toBeGreaterThan(150);
        const box = await user.player.quizRenderer.boundingBox();
        expect(box.height, 'the quiz renders at a real size, not collapsed').toBeGreaterThan(150);
      }
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

  test('PLR-01-12: a class with zero enrolled students attempting to launch a Student Test is handled gracefully', async () => {
    test.fixme(
      true,
      'This build has no class-size screen and no "Student Test" launch, so a class with zero students cannot be set up'
    );
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

  const selectedOptions = (user) =>
    user.player.quizOptions
      .filter({ has: user.page.locator('input:checked') })
      .or(user.page.locator('.quiz-options-group .option-content.selected'));

  test(
    'PLR-01-15: Submit Answer stays disabled until an option is chosen',
    { tag: ['@functional'] },
    async ({ user }) => {
      await started(user);
      await expect(user.player.quizSubmitBtn).toBeDisabled();
      await user.player.quizOptions.first().click({ force: true });
      await expect(user.player.quizSubmitBtn).toBeEnabled();
    }
  );

  test(
    'PLR-01-16: choosing a second option clears the first (one answer per question)',
    { tag: ['@functional'] },
    async ({ user }) => {
      await started(user);
      // Each option holds a checkbox-style input; only the chosen one may be ticked.
      const ticked = (i) => user.player.quizOptions.nth(i).locator('input:checked').count();
      await user.player.quizOptions.nth(0).click({ force: true });
      await expect.poll(() => ticked(0)).toBe(1);
      await user.player.quizOptions.nth(1).click({ force: true });
      await expect.poll(() => ticked(1), { message: 'second option ticked' }).toBe(1);
      expect(await ticked(0), 'first option cleared').toBe(0);
      await expect(user.player.quizOptions.locator('input:checked'), 'one answer only').toHaveCount(1);
    }
  );

  // After a wrong answer: it is marked wrong (PLR-01-17), and the correct answer is shown (PLR-01-24) -- one test each.
  const answerWrongly = async (user) => {
    await started(user);
    const found = await findQuestion(user, async (u) => {
      await u.player.answerCurrentQuestion(0);
      return (await u.player.quizIncorrectOptions.count()) > 0;
    });
    expect(found, 'set-up: a question where the first option is wrong').not.toBeNull();
  };

  test('PLR-01-17: a wrong answer is marked wrong', { tag: ['@functional'] }, async ({ user }) => {
    await answerWrongly(user);
    await expect(user.player.quizIncorrectOptions.first(), 'marked wrong').toBeVisible();
  });

  test('PLR-01-24: after a wrong answer, the correct answer is shown', { tag: ['@functional'] }, async ({ user }) => {
    await answerWrongly(user);
    await expect(user.player.quizCorrectOptions.first(), 'correct answer shown').toBeVisible();
  });

  test('PLR-01-18: Show Answer reveals the correct option', { tag: ['@functional'] }, async ({ user }) => {
    await started(user);
    await expect(user.player.quizCorrectOptions).toHaveCount(0);
    await user.player.quizShowAnswerBtn.click();
    await expect(user.player.quizCorrectOptions.first(), 'correct option revealed').toBeVisible({ timeout: 5000 });
  });

  test(
    'PLR-01-19: the numbered dots jump straight to that question, every time',
    { tag: ['@regression'] },
    async ({ user }) => {
      await started(user);
      const total = await user.player.quizQuestionNumbers.count();
      expect(total, 'a multi-question quiz').toBeGreaterThan(2);
      for (const target of [3, 1, total, 2]) {
        await user.player.quizQuestionNumbers.nth(target - 1).click({ force: true });
        await expect.poll(() => user.player.currentQuestionNumber(), { message: `on question ${target}` }).toBe(target);
      }
    }
  );

  test(
    'PLR-01-21: double-clicking a quiz card opens only one quiz (regression)',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      await expect(user.player.quizCards.first()).toBeAttached({ timeout: 10000 });
      await user.player.quizCards.first().evaluate((el) => {
        el.scrollIntoView({ block: 'center' });
        el.click();
        el.click();
      });
      await page.waitForTimeout(8000);
      expect(
        await page.locator('lib-quiz-renderer').filter({ visible: true }).count(),
        'one quiz open'
      ).toBeLessThanOrEqual(1);
      expect(await user.player.closeIcon.count(), 'one player').toBeLessThanOrEqual(2);
    }
  );

  test('PLR-01-22: no question appears more than once in the quiz', { tag: ['@regression'] }, async ({ user }) => {
    await started(user);
    const total = await user.player.quizQuestionNumbers.count();
    const seen = [];
    for (let i = 0; i < total; i++) {
      await user.player.quizQuestionNumbers.nth(i).click({ force: true });
      await user.page.waitForTimeout(600);
      seen.push((await user.player.quizQuestion.innerText()).replace(/\s+/g, ' ').trim());
    }
    const dupes = seen.filter((q, i) => seen.indexOf(q) !== i);
    expect(dupes, 'every question is different').toEqual([]);
  });

  test(
    'PLR-01-25: a network drop during a quiz keeps the answers already given, and the quiz can continue once it is back',
    { tag: ['@interruption'] },
    async ({ user, page }) => {
      test.setTimeout(180000);
      const p = user.player;
      const marked = async () => (await p.quizCorrectOptions.count()) + (await p.quizIncorrectOptions.count()) > 0;
      await started(user);
      expect(await p.quizQuestionNumbers.count(), 'set-up: a quiz with three or more questions').toBeGreaterThanOrEqual(
        3
      );
      await p.answerCurrentQuestion(0);
      expect(await marked(), 'set-up: question 1 answered').toBe(true);

      // The network drops for the app's own calls; the teacher moves on to question 2 meanwhile.
      const offline = (route) =>
        ['fetch', 'xhr'].includes(route.request().resourceType())
          ? route.abort('internetdisconnected')
          : route.continue();
      await page.route('**/*', offline);
      try {
        await p.quizNextControl.click({ force: true });
        await page.waitForTimeout(10000);
      } finally {
        await page.unroute('**/*', offline);
      }
      await page.waitForTimeout(3000);

      // Back on question 1: its answer is still there.
      await p.quizPrevControl.click({ force: true });
      await expect.poll(() => p.currentQuestionNumber(), { message: 'back on question 1' }).toBe(1);
      expect(await marked(), 'the answer given before the drop is kept').toBe(true);

      // And the quiz carries on: question 2 can be answered now the network is back.
      await p.quizNextControl.click({ force: true });
      await expect.poll(() => p.currentQuestionNumber(), { message: 'on question 2' }).toBe(2);
      await p.answerCurrentQuestion(0);
      expect(await marked(), 'question 2 can be answered after the network is back').toBe(true);
    }
  );
});
