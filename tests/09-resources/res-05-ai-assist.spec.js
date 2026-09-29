// RES-05 — AI Assist
// Source: CEPV2_Stories/09_Resources.md
// AI Assist loads three tabs (Exercise / Videos / Teaching Tips). "Add to Playlist" adds, or updates, a single
// "My Exercise" asset. CONFIRMED LIVE in the previous suite: AI Assist can intermittently return an error screen
// instead of content — that is treated as a real failure here, not skipped.

const { test, expect } = require('../../fixtures');

test.describe('RES-05 AI Assist', () => {
  // A clean topic on purpose (Class 12A Physics 1.5). The default topic's Playlist holds 360+ assets left by earlier
  // automation, including dozens of AI Assist FlashCards and a 64-page "My Exercise", so nothing there can be counted.
  test.use({ classMap: 'librarySuggestions' });

  const openAiAssist = async (user) => {
    await user.addResource.openAction('aiAssist');
    await expect(user.addResource.aiAssistTabExercise).toBeVisible({ timeout: 20000 });
  };
  const myExercise = (user) => user.playlist.resourceCards.filter({ hasText: /my exercise/i });
  // CONFIRMED LIVE (v 0.0.223): on a clean topic the FIRST add creates two cards -- "My Exercise" and "<topic> FlashCard" --
  // and every further add creates one more FlashCard while "My Exercise" stays a single asset that gains a page. The
  // FlashCard side effect is not in the story; the tests remove both kinds.
  const createdByAiAssist = (user) => user.playlist.resourceCards.filter({ hasText: /my exercise|flashcard/i });

  // "My Exercise" is created and owned by these tests (AI Assist adds to it, or updates it), so every test starts from
  // none and removes it again -- otherwise a single failed run leaves it behind and the next run's counts (and its page
  // count, one page per question) depend on whatever earlier runs added.
  const removeMyExercise = async (user) => {
    await user.playlist.ensureDrawerVisible();
    for (let guard = 0; guard < 12 && (await createdByAiAssist(user).count()) > 0; guard++) {
      await user.playlist.removeOwnedAsset(createdByAiAssist(user).first());
      await user.page.waitForTimeout(1000);
      await user.playlist.ensureDrawerVisible();
    }
  };
  // Add the n-th question and close the panel. CONFIRMED LIVE: the Playlist strip does not show the new card until the
  // AI Assist panel is closed. Returns the question's text.
  const addQuestion = async (user, index) => {
    const ar = user.addResource;
    await openAiAssist(user);
    await ar.aiAssistExerciseCheckboxes.nth(index).waitFor({ state: 'visible', timeout: 20000 });
    const question = await questionText(user, index);
    await ar.selectExercise(index);
    await ar.aiAssistAddToPlaylistBtn.click({ force: true });
    await user.page.waitForTimeout(4000);
    await ar.aiAssistCloseBtn.click({ force: true, timeout: 3000 }).catch(() => {});
    await user.page.waitForTimeout(2000);
    return question;
  };

  test.beforeEach(async ({ user }) => removeMyExercise(user));

  test.afterEach(async ({ user }) => removeMyExercise(user).catch(() => {}));

  /** First ~50 characters of the n-th exercise question, as listed in AI Assist. */
  const questionText = async (user, index) => {
    const box = user.addResource.aiAssistExerciseCheckboxes.nth(index);
    const own = ((await box.innerText()) || '').replace(/\s+/g, ' ').trim();
    const text = own || ((await box.locator('xpath=..').innerText()) || '').replace(/\s+/g, ' ').trim();
    return text.slice(0, 50);
  };
  /** Number of pages in the open My Exercise player -- one per question (the highest number in its paginator). */
  const pageCount = async (user) => {
    const nums = (await user.page.locator('button.mypage-link').allInnerTexts())
      .map((t) => parseInt(t, 10))
      .filter((n) => !Number.isNaN(n));
    return nums.length ? Math.max(...nums) : 0;
  };

  test(
    'RES-05-01: AI Assist loads and displays three tabs: Exercise, Videos and Teaching Tips',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await openAiAssist(user);
      await expect(user.addResource.aiAssistErrorScreen, 'no error screen').toHaveCount(0);
      await expect(user.addResource.aiAssistTabExercise).toBeVisible();
      await expect(user.addResource.aiAssistTabVideos).toBeVisible();
      await expect(user.addResource.aiAssistTabTeachingTips).toBeVisible();
    }
  );

  // Switching tabs: to Videos (RES-05-02), to Teaching Tips (RES-05-16), and back to Exercise (RES-05-17) -- one test
  // each (split 2026-09-28). Each opens on Exercise, which lists selectable questions.
  const openOnExercise = async (user) => {
    await openAiAssist(user);
    await expect(user.addResource.aiAssistExerciseCheckboxes.first(), 'set-up: Exercise lists questions').toBeVisible({
      timeout: 20000,
    });
  };

  test(
    'RES-05-02: switching to the Videos tab shows its video thumbnails in place of the questions',
    { tag: ['@functional'] },
    async ({ user }) => {
      const ar = user.addResource;
      await openOnExercise(user);
      await ar.aiAssistTabVideos.click({ force: true });
      await expect(ar.aiAssistVideoThumbs.first(), 'Videos lists video thumbnails').toBeVisible({ timeout: 20000 });
      await expect(ar.aiAssistExerciseCheckboxes.first()).toBeHidden();
    }
  );

  test(
    'RES-05-16: switching to the Teaching Tips tab shows teaching tips in place of the videos',
    { tag: ['@functional'] },
    async ({ user }) => {
      const ar = user.addResource;
      await openOnExercise(user);
      await ar.aiAssistTabVideos.click({ force: true });
      await expect(ar.aiAssistVideoThumbs.first(), 'set-up: on Videos').toBeVisible({ timeout: 20000 });
      await ar.aiAssistTabTeachingTips.click({ force: true });
      // CONFIRMED LIVE: the tab shows labelled teaching content ("Activities: ...", "Explanation: ..."); the words tip /
      // teaching / suggest only appear in the tab's own label, so they say nothing about the content.
      await expect(user.page.getByText(/^\s*Explanation:/).first(), 'Teaching Tips shows tips').toBeVisible({
        timeout: 20000,
      });
      await expect(ar.aiAssistVideoThumbs.first()).toBeHidden();
    }
  );

  test(
    'RES-05-17: switching back to the Exercise tab shows the questions again',
    { tag: ['@functional'] },
    async ({ user }) => {
      const ar = user.addResource;
      await openOnExercise(user);
      await ar.aiAssistTabTeachingTips.click({ force: true });
      await expect(user.page.getByText(/^\s*Explanation:/).first(), 'set-up: on Teaching Tips').toBeVisible({
        timeout: 20000,
      });
      await ar.aiAssistTabExercise.click({ force: true });
      await expect(ar.aiAssistExerciseCheckboxes.first(), 'back on Exercise').toBeVisible();
    }
  );

  test(
    'RES-05-03: selecting a question and clicking "Add to Playlist" adds a "My Exercise" asset to the Playlist',
    { tag: ['@smoke', '@functional', '@bug'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (v 0.0.223, 3 of 3 attempts on a clean topic, network-verified): "Add to Playlist" makes exactly three calls
      // (POST custom/qb, POST custom/quiz, PUT tp/sequence) and creates ONE new "<topic> FlashCard" quiz asset per add. It
      // creates no "My Exercise" and updates nothing existing, so a second add makes a second, separate asset -- the opposite of
      // this story. (A "My Exercise" was seen once earlier on a clean topic and could not be reproduced.) Tracked as
      // expected-to-fail so it isn't masked.
      test.fail(true, 'AI Assist "Add to Playlist" creates a "<topic> FlashCard" asset, not "My Exercise"');
      await user.playlist.ensureDrawerVisible();
      await expect(myExercise(user), 'starts with no "My Exercise"').toHaveCount(0);

      await addQuestion(user, 0);

      await expect(myExercise(user), 'a "My Exercise" asset was added').toHaveCount(1, { timeout: 10000 });
    }
  );

  test(
    'RES-05-04: opening the "My Exercise" asset shows the added question marked as selected',
    { tag: ['@functional', '@bug'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (v 0.0.223, 3 of 3 attempts on a clean topic, network-verified): "Add to Playlist" makes exactly three calls
      // (POST custom/qb, POST custom/quiz, PUT tp/sequence) and creates ONE new "<topic> FlashCard" quiz asset per add. It
      // creates no "My Exercise" and updates nothing existing, so a second add makes a second, separate asset -- the opposite of
      // this story. (A "My Exercise" was seen once earlier on a clean topic and could not be reproduced.) Tracked as
      // expected-to-fail so it isn't masked.
      // With no "My Exercise" to open, this cannot pass; the question that WAS added is checked on the FlashCard in RES-05-07.
      test.fail(true, 'No "My Exercise" asset exists to open after adding a question');
      await user.playlist.ensureDrawerVisible();
      const question = await addQuestion(user, 0);
      await expect(myExercise(user).first()).toBeVisible({ timeout: 10000 });

      await user.player.openResourceCard(myExercise(user));
      await user.page.waitForTimeout(2500);
      expect(question.length, 'the chosen question had text to look for').toBeGreaterThan(10);
      await expect(
        user.page.getByText(question.slice(0, 30), { exact: false }).first(),
        'the added question is the one shown'
      ).toBeVisible({ timeout: 10000 });
      await user.player.closePlayer();
    }
  );

  test(
    'RES-05-05: adding another question when "My Exercise" exists increases the count within the SAME asset',
    { tag: ['@functional', '@bug'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (v 0.0.223, 3 of 3 attempts on a clean topic, network-verified): "Add to Playlist" makes exactly three calls
      // (POST custom/qb, POST custom/quiz, PUT tp/sequence) and creates ONE new "<topic> FlashCard" quiz asset per add. It
      // creates no "My Exercise" and updates nothing existing, so a second add makes a second, separate asset -- the opposite of
      // this story. (A "My Exercise" was seen once earlier on a clean topic and could not be reproduced.) Tracked as
      // expected-to-fail so it isn't masked.
      test.fail(true, 'A second add creates a second separate asset instead of growing one "My Exercise"');
      await user.playlist.ensureDrawerVisible();
      await addQuestion(user, 0);
      await addQuestion(user, 1);

      await expect(myExercise(user), 'one "My Exercise" holds both questions').toHaveCount(1);
      await user.player.openResourceCard(myExercise(user));
      await user.page.waitForTimeout(2500);
      expect(await pageCount(user), 'both questions are in that one asset (one page each)').toBe(2);
      await user.player.closePlayer();
    }
  );

  test(
    'RES-05-06: "Add to Playlist" is disabled or blocked when no question is selected',
    { tag: ['@negative'] },
    async ({ user }) => {
      const ar = user.addResource;
      await user.playlist.ensureDrawerVisible();
      const before = await user.playlist.resourceCards.count();
      await openAiAssist(user);
      await expect(ar.aiAssistExerciseCheckboxes.first()).toBeVisible({ timeout: 20000 });
      // Nothing ticked.

      const disabled = await ar.aiAssistAddToPlaylistBtn.isDisabled().catch(() => false);
      if (!disabled) {
        await ar.aiAssistAddToPlaylistBtn.click({ force: true }).catch(() => {});
        await user.page.waitForTimeout(2500);
      }
      expect(
        disabled || (await user.playlist.resourceCards.count()) === before,
        'either the button is disabled, or clicking it adds nothing'
      ).toBe(true);
    }
  );

  test(
    'RES-05-07: each "Add to Playlist" creates its own "<topic> FlashCard" asset containing the chosen question',
    { tag: ['@regression'] },
    async ({ user }) => {
      // Observed behaviour, pinned so a change to it is noticed (see the finding on RES-05-03..05).
      const flashcards = user.playlist.resourceCards.filter({ hasText: /flashcard/i });
      await user.playlist.ensureDrawerVisible();
      await expect(flashcards, 'starts with none').toHaveCount(0);

      await addQuestion(user, 0);
      await expect(flashcards, 'one FlashCard after the first add').toHaveCount(1, { timeout: 10000 });
      await addQuestion(user, 1);
      await expect(flashcards, 'a second, separate FlashCard after the second add').toHaveCount(2, { timeout: 10000 });
    }
  );

  // --- Added 2026-09-26 (gap-fill from the reference suite's AI Assist workbook) ---

  test(
    "RES-05-08: one click on a tab switches to that tab's content (regression)",
    { tag: ['@regression'] },
    async ({ user }) => {
      const ar = user.addResource;
      await openAiAssist(user);
      await expect(ar.aiAssistExerciseCheckboxes.first()).toBeVisible({ timeout: 20000 });
      await ar.aiAssistTabVideos.click();
      await expect(ar.aiAssistVideoThumbs.first(), 'Videos content after ONE click').toBeVisible({ timeout: 10000 });
      await expect(ar.aiAssistExerciseCheckboxes.first()).toBeHidden();
    }
  );

  test('RES-05-09: the Videos tab shows videos for the current topic', { tag: ['@functional'] }, async ({ user }) => {
    const ar = user.addResource;
    const topic = (await user.whiteboard.currentChapterTopicBtn.innerText()).split('|').pop().trim();
    await openAiAssist(user);
    await ar.aiAssistTabVideos.click();
    await ar.aiAssistTabVideos.click().catch(() => {});
    await expect(ar.aiAssistVideoThumbs.first()).toBeVisible({ timeout: 20000 });
    const titles = (await ar.aiAssistVideoThumbs.allInnerTexts()).join(' ');
    const words = topic.split(/\W+/).filter((w) => w.length > 4);
    expect(
      words.some((w) => new RegExp(w, 'i').test(titles)),
      `videos relate to "${topic}"`
    ).toBe(true);
  });

  test(
    'RES-05-10: Teaching Tips shows Activities, Explanation and Real Life Example',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await openAiAssist(user);
      await user.addResource.aiAssistTabTeachingTips.click();
      await user.addResource.aiAssistTabTeachingTips.click().catch(() => {});
      for (const section of [/activit/i, /explanation/i, /real life example/i])
        await expect(page.getByText(section).filter({ visible: true }).first()).toBeVisible({ timeout: 20000 });
    }
  );

  // Minimize (RES-05-11) and Maximize (RES-05-18): one test each (split 2026-09-28).
  // CONFIRMED LIVE (2026-09-26): Minimize slides the panel down to a bar at the bottom of the window (the close button
  // moved from y~795 to y~945); the second click brings it back.
  /** Open AI Assist, then Minimize it; returns the close button's y while it was open. */
  const openThenMinimize = async (user) => {
    const ar = user.addResource;
    await openOnExercise(user);
    await expect(ar.aiAssistExerciseCheckboxes.first()).toBeInViewport();
    const openY = (await ar.aiAssistCloseBtn.boundingBox()).y;
    await ar.aiAssistMinimizeBtn.click();
    return openY;
  };

  test('RES-05-11: Minimize slides AI Assist down out of the way', { tag: ['@functional'] }, async ({ user }) => {
    const ar = user.addResource;
    const openY = await openThenMinimize(user);
    await expect
      .poll(async () => (await ar.aiAssistCloseBtn.boundingBox()).y, { message: 'panel slid down' })
      .toBeGreaterThan(openY + 50);
    await expect(ar.aiAssistExerciseCheckboxes.first(), 'questions out of view when minimized').not.toBeInViewport();
  });

  test('RES-05-18: Maximize brings a minimized AI Assist back up', { tag: ['@functional'] }, async ({ user }) => {
    const ar = user.addResource;
    const openY = await openThenMinimize(user);
    await expect
      .poll(async () => (await ar.aiAssistCloseBtn.boundingBox()).y, { message: 'set-up: panel slid down' })
      .toBeGreaterThan(openY + 50);
    await ar.aiAssistMinimizeBtn.click();
    await expect
      .poll(async () => (await ar.aiAssistCloseBtn.boundingBox()).y, { message: 'panel back up' })
      .toBeLessThan(openY + 5);
    await expect(ar.aiAssistExerciseCheckboxes.first(), 'questions back in view').toBeInViewport();
  });

  test('RES-05-12: Close exits AI Assist cleanly', { tag: ['@functional'] }, async ({ user }) => {
    await openAiAssist(user);
    await user.addResource.aiAssistCloseBtn.click();
    await expect(user.addResource.aiAssistTabExercise).toBeHidden({ timeout: 5000 });
  });

  test(
    'RES-05-13: double-clicking "Add to Playlist" adds the exercise only once (regression)',
    { tag: ['@regression'] },
    async ({ user }) => {
      const ar = user.addResource;
      await openAiAssist(user);
      await ar.selectExercise(0);
      await ar.aiAssistAddToPlaylistBtn.dblclick({ force: true });
      await user.page.waitForTimeout(4000);
      await ar.aiAssistCloseBtn.click({ force: true }).catch(() => {});
      await user.page.waitForTimeout(2000);
      await user.playlist.ensureDrawerVisible();
      // One add creates one "<topic> FlashCard" asset in this build (RES-05-03 records that it is not "My Exercise"), so a
      // double click must still leave exactly one.
      await expect(createdByAiAssist(user), 'one card, not two, from a double click').toHaveCount(1, {
        timeout: 15000,
      });
    }
  );

  test(
    'RES-05-14: opening and closing AI Assist 5 times leaves exactly one AI Assist window',
    { tag: ['@edge'] },
    async ({ user }) => {
      for (let i = 0; i < 5; i++) {
        await openAiAssist(user);
        await user.addResource.aiAssistCloseBtn.click();
        await expect(user.addResource.aiAssistTabExercise).toBeHidden({ timeout: 5000 });
      }
      await openAiAssist(user);
      await expect(user.addResource.aiAssistCloseBtn, 'one window').toHaveCount(1);
    }
  );

  test('RES-05-15: switching class while AI Assist is open closes it cleanly', { tag: ['@edge'] }, async ({ user }) => {
    await openAiAssist(user);
    await user.nav.applyClassMap('navigationGeneral');
    await expect(user.whiteboard.currentClassBtn).toContainText('Class 5');
    await expect(user.addResource.aiAssistTabExercise, 'AI Assist closed').toBeHidden({ timeout: 10000 });
  });
});
