// PLR-15 — Every player opens, renders and can be used
// Source: CEPV2_Stories/11_Players.md
//
// Data:
//   'quiz'               Class 11A Accountancy 3.1 -- "Play Quiz" (5 questions) and a Lecture Note.
//   'playersDefault'     Class 12A Computer Science 2.2 -- Video, Worksheet (PDF), Code, Image, Quiz.
//   'playersWeblink'     Class 12A Physics 1.1 -- Web link "Web: Example Domain", image "board-photo", FlashCards.
//   'playersInteractive' Class 12A Physics 1.2 -- Interactivity, Keywords, Concept Map, PhET simulation, lab,
//                        lecture note and 3D videos. These tests only open players there; nothing is written on the board.
// The ebook (PLR-04), code editor (PLR-10) and checkpoints (PLR-09) have their own stories.

const { test, expect } = require('../../fixtures');

const ISSUES = 'evidence/issues';

/** Saves a screenshot of the current screen as evidence for a failed check. */
const evidence = async (page, name) => {
  await page.screenshot({ path: `${ISSUES}/players-${name}.png` }).catch(() => {});
};

/** Collects uncaught script errors raised while a test runs. */
const watchErrors = (page) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
};

test.describe('PLR-15 Every player opens, renders and can be used', () => {
  test.afterEach(async ({ app }) => {
    for (let i = 0; i < 3; i++) await app.player.closePlayer().catch(() => {});
  });

  // ------------------------------------------------------------------------------------------------- Quiz
  test.describe('Quiz', () => {
    test.use({ classMap: 'quiz' });

    const start = async (user) => {
      const result = await user.player.startQuiz();
      expect(result.cameraBlocked, 'the quiz was not blocked waiting for a camera').toBe(false);
      expect(result.reachedQuestion, 'the first question loaded').toBe(true);
    };
    const questionText = async (user) => (await user.player.quizQuestion.innerText()).replace(/\s+/g, ' ').trim();
    const marked = async (user) =>
      (await user.player.quizCorrectOptions.count()) + (await user.player.quizIncorrectOptions.count());

    test('PLR-15-01: the quiz renders its question text and its options', { tag: ['@smoke'] }, async ({ user }) => {
      await start(user);
      expect((await questionText(user)).length, 'the question has text').toBeGreaterThan(5);
      const labels = (await user.player.quizOptionLabels.allInnerTexts()).map((t) => t.trim());
      expect(labels.length, 'at least two options').toBeGreaterThan(1);
      for (const label of labels) expect(label.length, 'every option has text').toBeGreaterThan(0);
    });

    test('PLR-15-02: submitting an answer shows right/wrong feedback and a Next Question button', async ({ user }) => {
      await start(user);
      await user.player.answerCurrentQuestion(0);
      expect(await marked(user), 'the answer is marked correct or incorrect').toBeGreaterThan(0);
      await expect(user.player.quizNextQuestionBtn, 'Next Question is offered').toBeVisible({ timeout: 5000 });
    });

    test('PLR-15-03: Next Question shows the next, different question', async ({ user }) => {
      await start(user);
      const first = await questionText(user);
      await user.player.answerCurrentQuestion(0);
      await user.player.quizNextQuestionBtn.click();
      await expect.poll(() => user.player.currentQuestionNumber(), { message: 'on question 2' }).toBe(2);
      expect(await questionText(user), 'a different question').not.toBe(first);
      await expect(user.player.quizSubmitBtn, 'the new question is ready to answer').toBeVisible();
    });

    test('PLR-15-04: answering every question finishes the quiz with "Quiz Complete!"', async ({ user }) => {
      await start(user);
      const total = await user.player.quizQuestionNumbers.count();
      for (let q = 1; q <= total; q++) {
        await user.player.answerCurrentQuestion(0);
        if (q < total) {
          await user.player.quizNextQuestionBtn.click();
          await expect.poll(() => user.player.currentQuestionNumber()).toBe(q + 1);
        }
      }
      await expect(user.player.quizCompleteMsg, 'the quiz says it is complete').toBeVisible({ timeout: 10000 });
      await expect(user.player.quizNextQuestionBtn, 'no Next Question after the last one').toBeHidden();
    });

    test('PLR-15-05: moving on without answering leaves that question unanswered', async ({ user }) => {
      await start(user);
      await user.player.quizNextControl.click({ force: true });
      await expect.poll(() => user.player.currentQuestionNumber(), { message: 'skipping is allowed' }).toBe(2);
      await user.player.quizPrevControl.click({ force: true });
      await expect.poll(() => user.player.currentQuestionNumber()).toBe(1);
      expect(await marked(user), 'question 1 has no right/wrong marks').toBe(0);
      await expect(user.player.quizSubmitBtn, 'and can still be answered').toBeDisabled();
    });

    test('PLR-15-06: changing the answer before submitting scores the last choice', async ({ user }) => {
      await start(user);
      await user.player.quizOptions.nth(0).click({ force: true });
      await user.player.quizOptions.nth(1).click({ force: true });
      await user.player.quizSubmitBtn.click({ force: true });
      await expect.poll(() => marked(user), { message: 'the answer is scored' }).toBeGreaterThan(0);
      await expect(user.player.quizOptions.nth(1), 'the second (last) choice is the one scored').toHaveClass(
        /correct|incorrect/
      );
      await expect(user.player.quizOptions.nth(0), 'the first choice is not marked wrong').not.toHaveClass(/incorrect/);
    });

    test('PLR-15-07: after finishing, the quiz reopens and shows a question', async ({ user }) => {
      await start(user);
      const total = await user.player.quizQuestionNumbers.count();
      for (let q = 1; q <= total; q++) {
        await user.player.quizQuestionNumbers.nth(q - 1).click({ force: true });
        await user.page.waitForTimeout(600);
        await user.player.answerCurrentQuestion(0);
      }
      await user.player.quizCloseBtn.click({ force: true });
      await expect(user.player.quizRenderer, 'the quiz closed').toBeHidden({ timeout: 10000 });
      await start(user);
      expect((await questionText(user)).length, 'a question renders again').toBeGreaterThan(5);
      expect(await user.player.quizOptions.count(), 'with its options').toBeGreaterThan(1);
    });

    test('PLR-15-08: no question of the quiz shows "undefined", "null" or raw keys', async ({ user, page }) => {
      await start(user);
      const total = await user.player.quizQuestionNumbers.count();
      const leaks = [];
      for (let q = 0; q < total; q++) {
        await user.player.quizQuestionNumbers.nth(q).click({ force: true });
        await page.waitForTimeout(600);
        leaks.push(...(await user.player.leakedText()));
      }
      if (leaks.length) await evidence(page, 'quiz-leaked-text');
      expect(leaks).toEqual([]);
    });

    test('PLR-15-09: the lecture note opens and renders its slides', async ({ user, page }) => {
      const errors = watchErrors(page);
      await user.player.openResourceCard(user.player.cardByTitle(/^Lecture Note/));
      expect(await user.player.isPlayerOpen(), 'the player opened').toBe(true);
      await expect.poll(async () => (await user.player.contentFrameState()).loaded, { timeout: 30000 }).toBe(true);
      const { size } = await user.player.contentFrameState();
      expect(size.width, 'a real-size player').toBeGreaterThan(300);
      expect(size.height).toBeGreaterThan(200);
      expect(errors, 'no script errors').toEqual([]);
    });
  });

  // ------------------------------------------------------------------------------------------ Video / PDF
  test.describe('Video and worksheet', () => {
    test.use({ classMap: 'playersDefault' });

    const openVideo = async (user) => {
      await user.player.openResourceCard(user.player.videoCards);
      expect(await user.player.isPlayerOpen(), 'the video player opened').toBe(true);
      await expect
        .poll(async () => (await user.player.videoState().catch(() => ({ readyState: 0 }))).readyState, {
          message: 'the video has loaded',
          timeout: 25000,
        })
        .toBeGreaterThanOrEqual(2);
    };

    test('PLR-15-10: the video renders a frame and shows its length', { tag: ['@smoke'] }, async ({ user }) => {
      await openVideo(user);
      const info = await user.player.videoElement.evaluate((v) => ({
        w: v.videoWidth,
        h: v.videoHeight,
        d: v.duration,
      }));
      expect(info.w, 'the video has a picture').toBeGreaterThan(0);
      expect(info.h).toBeGreaterThan(0);
      expect(info.d, 'and a length').toBeGreaterThan(1);
    });

    test('PLR-15-11: a video played to its end stops cleanly and can be played again', async ({ user, page }) => {
      const errors = watchErrors(page);
      await openVideo(user);
      const { duration } = await user.player.videoState();
      await user.player.videoElement.evaluate((v, t) => (v.currentTime = t), Math.max(0, duration - 1.5));
      await user.player.toggleVideoPlayback();
      await expect
        .poll(() => user.player.videoElement.evaluate((v) => v.ended), {
          message: 'it plays to the end',
          timeout: 20000,
        })
        .toBe(true);
      expect(await user.player.isPlayerOpen(3000), 'the player stays open at the end').toBe(true);
      await user.player.toggleVideoPlayback();
      await expect
        .poll(async () => (await user.player.videoState()).paused, { message: 'play again starts it', timeout: 10000 })
        .toBe(false);
      expect(errors, 'no script errors').toEqual([]);
    });

    const openWorksheet = async (user) => {
      await user.player.openResourceCard(user.player.worksheetCards);
      expect(await user.player.isPlayerOpen(), 'the worksheet opened').toBe(true);
      await expect(user.page.locator('canvas').filter({ visible: true }).first()).toBeVisible({ timeout: 20000 });
      await user.page.waitForTimeout(1500);
    };
    const pageNumber = async (user) => {
      const active = user.page.locator('li.page-item.active, li.page-item.current').filter({ visible: true }).first();
      let text = await active.innerText().catch(() => '');
      if (!/\d/.test(text)) text = await user.player.worksheetGoToPageInput.inputValue().catch(() => '');
      const n = parseInt(String(text).replace(/\D/g, ''), 10);
      return Number.isNaN(n) ? null : n;
    };

    test('PLR-15-12: the worksheet (PDF) draws its page content', async ({ user }) => {
      await openWorksheet(user);
      // The PDF page is the largest 2D canvas on screen; count opaque, dark (inked) pixels on it.
      const inked = await user.page.locator('canvas').evaluateAll((canvases) => {
        let best = 0;
        for (const c of canvases) {
          const r = c.getBoundingClientRect();
          if (!c.width || r.width < 200 || r.height < 200) continue;
          let ctx = null;
          try {
            ctx = c.getContext('2d');
          } catch {
            ctx = null;
          }
          if (!ctx) continue;
          const { data } = ctx.getImageData(0, 0, c.width, c.height);
          let dark = 0;
          for (let i = 0; i < data.length; i += 4 * 50) {
            if (data[i + 3] > 200 && data[i] + data[i + 1] + data[i + 2] < 300) dark++;
          }
          best = Math.max(best, dark);
        }
        return best;
      });
      expect(inked, 'the page is not blank').toBeGreaterThan(10);
      expect(await pageNumber(user), 'a page number is shown').toBe(1);
    });

    test('PLR-15-13: very fast Next presses land on a valid page with the player still up', async ({ user, page }) => {
      const errors = watchErrors(page);
      await openWorksheet(user);
      for (let i = 0; i < 6; i++) await user.player.worksheetNextPage.first().click({ force: true, delay: 0 });
      await page.waitForTimeout(2000);
      const now = await pageNumber(user);
      expect(now, 'moved forward').toBeGreaterThan(1);
      expect(await user.player.isPlayerOpen(3000), 'player still up').toBe(true);
      expect(errors, 'no script errors').toEqual([]);
    });

    test('PLR-15-14: very fast Next then Previous presses come back to page 1', async ({ user, page }) => {
      await openWorksheet(user);
      for (let i = 0; i < 4; i++) await user.player.worksheetNextPage.first().click({ force: true });
      await page.waitForTimeout(800);
      for (let i = 0; i < 8; i++) await user.player.worksheetPrevPage.first().click({ force: true });
      await expect.poll(() => pageNumber(user), { message: 'back on page 1', timeout: 8000 }).toBe(1);
    });
  });

  // -------------------------------------------------------------------------------- Image / web link / flashcard
  test.describe('Image, web link and flashcards', () => {
    test.use({ classMap: 'playersWeblink' });

    test('PLR-15-15: an image renders at its natural size', { tag: ['@smoke'] }, async ({ user }) => {
      await user.player.openResourceCard(user.player.cardByTitle(/^board-photo$/));
      await expect(user.player.imageWrapper).toBeVisible({ timeout: 15000 });
      await expect
        .poll(() => user.player.imageGalleryImg.first().evaluate((el) => el.complete && el.naturalWidth > 0), {
          message: 'the picture loaded',
          timeout: 15000,
        })
        .toBe(true);
      const box = await user.player.imageGalleryImg.first().boundingBox();
      expect(box.width, 'shown at a real size').toBeGreaterThan(100);
    });

    test('PLR-15-16: a web link loads its page inside the player', { tag: ['@smoke'] }, async ({ user, page }) => {
      await user.player.openResourceCard(user.player.cardByTitle(/Web: Example Domain/));
      await expect(user.player.weblinkWrapper).toBeVisible({ timeout: 15000 });
      await expect(
        page
          .frameLocator('.weblink-wrapper iframe')
          .getByText(/Example Domain|documentation examples/)
          .first(),
        'the linked page has loaded'
      ).toBeVisible({ timeout: 20000 });
    });

    test('PLR-15-17: a flashcard shows its card and the arrow moves it on', async ({ user, page }) => {
      await user.player.openResourceCard(user.player.cardByTitle(/FlashCard/));
      await expect(user.player.flashcardContainer).toBeVisible({ timeout: 15000 });
      const before = (await user.player.flashcardContainer.innerText()).replace(/\s+/g, ' ').trim();
      expect(before.length, 'the card has text').toBeGreaterThan(10);
      await user.player.flashcardNextArrow.first().click();
      await page.waitForTimeout(1500);
      const after = (await user.player.flashcardContainer.innerText()).replace(/\s+/g, ' ').trim();
      expect(after, 'the card changed (answer side or next card)').not.toBe(before);
    });
  });

  // ------------------------------------------------------------------------------- HTML5 content players
  test.describe('Interactivity, simulations and other HTML5 content', () => {
    test.use({ classMap: 'playersInteractive' });

    const openContent = async (user, title) => {
      await expect(user.player.cardByTitle(title).first()).toBeAttached({ timeout: 15000 });
      await user.player.openResourceCard(user.player.cardByTitle(title));
      expect(await user.player.isPlayerOpen(), 'the player opened').toBe(true);
      await expect
        .poll(async () => (await user.player.contentFrameState().catch(() => ({ loaded: false }))).loaded, {
          message: 'the content inside the player has loaded',
          timeout: 30000,
        })
        .toBe(true);
      await user.page.waitForTimeout(2500);
    };
    const changesAfter = async (user, act) => {
      const before = await user.player.contentFrameShot();
      await act();
      await user.page.waitForTimeout(2000);
      const after = await user.player.contentFrameShot();
      return !before.equals(after);
    };

    const KINDS = [
      ['18', 'an Interactivity', /^Interactivity: Electric charge$/],
      ['20', 'a Keywords activity', /^Keywords: Electric charge$/],
      ['22', 'a Concept Map', /^Concept Map: Electric charge$/],
      ['24', 'a PhET simulation', /^John Travoltage$/],
      ['26', 'a lab', /John Travoltage Lab/],
    ];
    for (const [id, kind, title] of KINDS) {
      test(`PLR-15-${id}: ${kind} opens and renders its content`, async ({ user, page }) => {
        const errors = watchErrors(page);
        await openContent(user, title);
        const { size } = await user.player.contentFrameState();
        expect(size.width, 'a real-size player').toBeGreaterThan(300);
        expect(size.height).toBeGreaterThan(200);
        const leaks = await user.player.leakedText();
        if (leaks.length) await evidence(page, `leaked-text-${id}`);
        expect(leaks, 'no "undefined"/"null"/raw keys').toEqual([]);
        expect(errors, 'no script errors').toEqual([]);
      });
    }

    test('PLR-15-19: an Interactivity responds to dragging an object to a drop zone', async ({ user }) => {
      await openContent(user, /^Interactivity: Electric charge$/);
      // Drag the balloon (top-left tile) into the "By Friction" column.
      const changed = await changesAfter(user, () => user.player.interactInContentFrame([0.1, 0.2], [0.18, 0.55]));
      expect(changed, 'the activity reacts to the drag').toBe(true);
    });

    test('PLR-15-21: choosing a keyword shows its meaning', async ({ user }) => {
      await openContent(user, /^Keywords: Electric charge$/);
      // The keyword list is on the left: "Electric charge", "Charging by friction", ...
      const changed = await changesAfter(user, () => user.player.interactInContentFrame([0.09, 0.12]));
      expect(changed, 'the shown meaning changes').toBe(true);
    });

    test('PLR-15-23: the Concept Map zooms in', async ({ user }) => {
      await openContent(user, /^Concept Map: Electric charge$/);
      // The zoom "+" is at the right end of the bottom bar.
      const changed = await changesAfter(user, () => user.player.interactInContentFrame([0.893, 0.957]));
      expect(changed, 'the map is redrawn larger').toBe(true);
    });

    test('PLR-15-25: a PhET simulation responds to the teacher', async ({ user }) => {
      await openContent(user, /^John Travoltage$/);
      // Rub the foot on the rug: charge builds up on the figure.
      const changed = await changesAfter(user, async () => {
        for (let i = 0; i < 3; i++) await user.player.interactInContentFrame([0.6, 0.85], [0.45, 0.9]);
      });
      expect(changed, 'the simulation reacts').toBe(true);
    });

    test('PLR-15-27: a lecture note moves to its next slide', async ({ user }) => {
      await openContent(user, /^Lecture Note/);
      // The slide controls sit at the bottom centre; the last one moves forward.
      const changed = await changesAfter(user, () => user.player.interactInContentFrame([0.56, 0.92]));
      expect(changed, 'the slide changes').toBe(true);
    });

    test('PLR-15-28: a 3D animation video plays', async ({ user }) => {
      await openContent(user, /^Electric charge \(3D\)$/);
      await expect.poll(async () => Boolean(await user.player.findVideoFrame()), { timeout: 15000 }).toBe(true);
      const frame = await user.player.findVideoFrame();
      const video = frame.locator('video').first();
      expect(await video.evaluate((v) => v.duration), 'it has a length').toBeGreaterThan(1);
      await user.player.interactInContentFrame([0.381, 0.968]);
      await expect
        .poll(() => video.evaluate((v) => v.currentTime), { message: 'it plays', timeout: 15000 })
        .toBeGreaterThan(0.5);
    });

    test('PLR-15-29: double-clicking an Interactivity card opens one player', async ({ user, page }) => {
      await user.player
        .cardByTitle(/^Interactivity: Electric charge$/)
        .first()
        .evaluate((el) => {
          el.scrollIntoView({ block: 'center' });
          el.click();
          el.click();
        });
      await page.waitForTimeout(6000);
      await expect(user.player.contentFrame, 'one content player').toHaveCount(1);
    });

    test('PLR-15-30: closing an Interactivity the moment it opens leaves nothing behind', async ({ user, page }) => {
      await user.player.openResourceCard(user.player.cardByTitle(/^Interactivity: Electric charge$/));
      await user.player.closeIcon.first().waitFor({ state: 'visible', timeout: 15000 });
      await user.player.closeIcon.first().click({ force: true });
      await page.waitForTimeout(3000);
      await expect(user.player.contentFrame, 'no player left').toHaveCount(0);
      await expect(user.player.closeIcon, 'no close icon left').toHaveCount(0);
    });

    test('PLR-15-31: switching class with a player open closes it', async ({ user, page }) => {
      await openContent(user, /^Keywords: Electric charge$/);
      await user.nav.resetToClass('Class 12', 'A', 'Computer Science');
      await page.waitForTimeout(3000);
      await expect(user.player.contentFrame, 'the old player is gone').toHaveCount(0);
      await expect(user.playlist.contentsTile, 'the new class is usable').toBeVisible();
    });

    test('PLR-15-32: opening content with the network cut shows a message, not a blank player', async ({
      user,
      page,
    }) => {
      test.setTimeout(150000);
      await expect(user.player.cardByTitle(/^Concept Map: Electric charge$/).first()).toBeAttached();
      await user.guest.cutNetwork();
      try {
        await user.player.openResourceCard(user.player.cardByTitle(/^Concept Map: Electric charge$/));
        const message = page
          .getByText(/network|offline|internet|connection|unable|failed|try again|retry/i)
          .filter({ visible: true })
          .first();
        const shown = await message
          .waitFor({ state: 'visible', timeout: 20000 })
          .then(() => true)
          .catch(() => false);
        if (!shown) await evidence(page, 'offline-open-no-message');
        expect(shown, 'the teacher is told the content cannot load').toBe(true);
      } finally {
        await user.guest.restoreNetwork();
      }
    });
  });
});
