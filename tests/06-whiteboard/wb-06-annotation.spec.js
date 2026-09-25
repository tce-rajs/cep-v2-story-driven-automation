// WB-06 — Annotation (per-topic whiteboards and autosave)
// Source: CEPV2_Stories/06_Whiteboard.md
//
// Not automated (per PROCESS.md, Plan Mode is manual-only): WB-06-06 (Teach↔Plan round-trip).
//
// Method: every scenario adds content of the three kinds (lines/sentence, Gallery image, shape), WAITS for the
// top-centre "Whiteboard Saved!" message (never an arbitrary timer), then compares a snapshot of the board taken
// before and after the disturbance. Snapshots are compared, not absolute counts, because each topic's board keeps
// whatever earlier runs left on it.

const { chromium } = require('@playwright/test');
const { test, expect } = require('../../fixtures');
const { BASE_URL } = require('../../config/env');

const { App } = require('../../pages/app');

// The desktop client cannot open a second tab (CDP: "Target.createTarget: Not supported"), so the "second tab" of the
// concurrency scenarios is a separate browser session (own storage) signed in to the same account.
const openSecondSession = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1920, height: 1080 } });
  return { browser, tab: await context.newPage() };
};

const TOPIC_A = { chapter: 0, topic: 0 };
const TOPIC_B = { chapter: 1, topic: 0 };

const goTo = async (user, { chapter, topic }) => {
  await user.nav.goToChapterTopic(chapter, topic);
  await user.toolbar.waitForBoardToSettle();
};

const reloadApp = async (user) => {
  await user.page.reload();
  await user.login.avatar.waitFor({ state: 'visible', timeout: 20000 });
  await user.toolbar.waitForBoardToSettle();
};

test.describe('WB-06 Annotation', () => {
  test.beforeEach(async ({ user }) => {
    await user.nav.applyClassMap('toolbarGeneral');
    await goTo(user, TOPIC_A);
  });

  test('WB-06-01: each topic has its own separate whiteboard', { tag: ['@smoke', '@functional'] }, async ({ user }) => {
    const tagA = `A${Date.now()}`;
    const tagB = `B${Date.now()}`;

    await user.content.addLines(tagA);
    await user.content.waitForSaved();
    const snapA = await user.content.snapshot();

    await goTo(user, TOPIC_B);
    const openedB = await user.content.snapshot();
    expect(openedB.texts.join('|'), 'topic A content does not appear on topic B').not.toContain(tagA);
    await user.content.addLines(tagB);
    await user.content.waitForSaved();
    const snapB = await user.content.snapshot();

    await goTo(user, TOPIC_A);
    const backOnA = await user.content.snapshot();
    expect(backOnA.texts.join('|'), 'topic B content does not appear on topic A').not.toContain(tagB);
    expect(backOnA, 'topic A shows exactly its own data').toEqual(snapA);
    expect(snapB).not.toEqual(snapA);
  });

  test.describe('WB-06-02: each content type triggers the success message and survives a refresh', () => {
    const kinds = [
      ['lines / sentence', (user, tag) => user.content.addLines(tag)],
      ['Gallery image', (user) => user.content.addGalleryImage()],
      ['shape', (user) => user.content.addShape()],
    ];
    for (const [label, add] of kinds) {
      test(`WB-06-02: ${label}`, { tag: ['@functional'] }, async ({ user }) => {
        const before = await user.content.snapshot();

        await add(user, `refresh${Date.now()}`);
        await user.content.waitForSaved(); // the top-centre success message

        const saved = await user.content.snapshot();
        expect(saved.paths + saved.images + saved.texts.length, 'content was added').toBeGreaterThan(
          before.paths + before.images + before.texts.length
        );
        const savedGeometry = await user.content.pathGeometry();
        const savedImages = await user.content.imageFingerprint();

        await reloadApp(user);
        expect(await user.content.snapshot(), 'still there after a refresh').toEqual(saved);
        // snapshot() only counts paths/images; these catch a refresh that keeps the right COUNT but corrupts the
        // exact shape/position (geometry) or swaps in the wrong image (identity).
        expect(await user.content.pathGeometry(), 'exact stroke/shape geometry survived the refresh').toEqual(
          savedGeometry
        );
        expect(
          await user.content.imageFingerprint(),
          'exact images (identity, position, size) survived the refresh'
        ).toEqual(savedImages);
      });
    }
  });

  test(
    'WB-06-03: topic switch round-trip keeps content exactly as left',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await user.content.addAll(`topicswitch${Date.now()}`);
      await user.content.waitForSaved();
      const before = await user.content.snapshot();
      const beforeGeometry = await user.content.pathGeometry();
      const beforeImages = await user.content.imageFingerprint();

      await goTo(user, TOPIC_B);
      await goTo(user, TOPIC_A);

      expect(await user.content.snapshot()).toEqual(before);
      expect(await user.content.pathGeometry(), 'exact geometry survived the topic switch').toEqual(beforeGeometry);
      expect(await user.content.imageFingerprint(), 'exact images survived the topic switch').toEqual(beforeImages);
    }
  );

  test('WB-06-04: logout/login round-trip keeps the added content', { tag: ['@functional'] }, async ({ user }) => {
    await user.content.addAll(`relogin${Date.now()}`);
    await user.content.waitForSaved();
    const before = await user.content.snapshot();
    const beforeGeometry = await user.content.pathGeometry();
    const beforeImages = await user.content.imageFingerprint();

    await user.userMenu.signOut();
    await user.signIn();
    await goTo(user, TOPIC_A); // whether login itself returns here is NAV-05, not this case

    expect(await user.content.snapshot()).toEqual(before);
    expect(await user.content.pathGeometry(), 'exact geometry survived the logout/login round-trip').toEqual(
      beforeGeometry
    );
    expect(await user.content.imageFingerprint(), 'exact images survived the logout/login round-trip').toEqual(
      beforeImages
    );
  });

  test('WB-06-05: class switch round-trip keeps the added content', { tag: ['@functional'] }, async ({ user }) => {
    await user.content.addAll(`classswitch${Date.now()}`);
    await user.content.waitForSaved();
    const before = await user.content.snapshot();
    const beforeGeometry = await user.content.pathGeometry();
    const beforeImages = await user.content.imageFingerprint();

    await user.nav.resetToClass('Class 9', 'A', 'Hindi Language');
    await user.nav.applyClassMap('toolbarGeneral'); // back to Class 12A Physics, chapter 0 topic 0
    await user.toolbar.waitForBoardToSettle();

    expect(await user.content.snapshot()).toEqual(before);
    expect(await user.content.pathGeometry(), 'exact geometry survived the class switch').toEqual(beforeGeometry);
    expect(await user.content.imageFingerprint(), 'exact images survived the class switch').toEqual(beforeImages);
  });

  test(
    'WB-06-07: switching topics rapidly, several times, before each finishes loading does not corrupt content',
    { tag: ['@regression'] },
    async ({ user }) => {
      // Two save-waits plus a dozen topic switches take ~85s, right at the suite's 90s default; when the timeout hit,
      // Playwright closed the window and the test reported "Target page ... has been closed" instead of a timeout.
      test.setTimeout(4 * 60 * 1000);
      const tagA = `rapidA${Date.now()}`;
      const tagB = `rapidB${Date.now()}`;
      await user.content.addLines(tagA);
      await user.content.waitForSaved();
      await goTo(user, TOPIC_B);
      await user.content.addLines(tagB);
      await user.content.waitForSaved();
      await goTo(user, TOPIC_A);
      const snapA = await user.content.snapshot();
      await goTo(user, TOPIC_B);
      const snapB = await user.content.snapshot();

      // Six back-to-back switches with no waiting for the previous one to load.
      for (let i = 0; i < 6; i++) {
        const target = i % 2 ? TOPIC_A : TOPIC_B;
        await user.nav.currentChapterTopicBtn.click({ force: true, timeout: 3000 }).catch(() => {});
        await user.nav.chapterItems
          .nth(target.chapter)
          .click({ force: true, timeout: 3000 })
          .catch(() => {});
        await user.nav.topicItems
          .nth(target.topic)
          .click({ force: true, timeout: 3000 })
          .catch(() => {});
      }
      await user.page.waitForTimeout(3000);

      await goTo(user, TOPIC_A);
      expect(await user.content.snapshot(), 'topic A intact').toEqual(snapA);
      await goTo(user, TOPIC_B);
      expect(await user.content.snapshot(), 'topic B intact').toEqual(snapB);
    }
  );

  test(
    'WB-06-08: erased shapes/annotations do not reappear after a topic switch',
    { tag: ['@regression'] },
    async ({ user }) => {
      const tb = user.toolbar;
      const start = await tb.pathCount();
      await user.content.addShape({ x: 800, y: 300 }); // rectangle (800,300)-(980,420)
      await user.content.waitForSaved();
      expect(await tb.pathCount()).toBe(start + 1);

      // Erase it, sweeping along each edge until it is gone.
      for (let pass = 0; pass < 4 && (await tb.pathCount()) > start; pass++) {
        await tb.eraseDrag({ x: 780, y: 300 }, { x: 1000, y: 300 });
        await tb.eraseDrag({ x: 980, y: 280 }, { x: 980, y: 440 });
        await tb.eraseDrag({ x: 1000, y: 420 }, { x: 780, y: 420 });
        await tb.eraseDrag({ x: 800, y: 440 }, { x: 800, y: 280 });
      }
      const afterErase = await tb.pathCount();
      expect(afterErase, 'the shape was erased').toBeLessThanOrEqual(start);
      await user.content.waitForSaved();

      await goTo(user, TOPIC_B);
      await goTo(user, TOPIC_A);
      expect(await tb.pathCount(), 'erased content did not come back').toBe(afterErase);
    }
  );

  test(
    'WB-06-09: navigating away before the save message appears does not lose content',
    { tag: ['@regression'] },
    async ({ user }) => {
      const tb = user.toolbar;
      const before = await tb.pathCount();
      await tb.penStroke({ x: 500, y: 700 }, { x: 760, y: 740 });

      // Leave IMMEDIATELY — no waiting for the success message.
      await goTo(user, TOPIC_B);
      await goTo(user, TOPIC_A);

      expect(await tb.pathCount(), 'the stroke drawn just before leaving is still there').toBeGreaterThanOrEqual(
        before + 1
      );
    }
  );

  test(
    'WB-06-10: adding a large volume of content to one topic in one session does not crash the browser',
    { tag: ['@performance', '@regression'] },
    async ({ user }) => {
      test.setTimeout(8 * 60 * 1000);
      const before = await user.toolbar.pathCount();
      await user.toolbar.selectTool('gtPen');
      for (let i = 0; i < 150; i++) {
        await user.content.rapidStroke(
          { x: 200 + (i % 30) * 40, y: 300 + Math.floor(i / 30) * 60 },
          { x: 230 + (i % 30) * 40, y: 340 + Math.floor(i / 30) * 60 }
        );
      }
      await user.content.waitForSaved(90000);

      expect(await user.toolbar.pathCount(), 'the volume actually landed').toBeGreaterThanOrEqual(before + 100);
      await expect(user.toolbar.container).toBeVisible();
      await expect(user.login.avatar).toBeVisible();
    }
  );

  test(
    'WB-06-11: 500+ rapid pen strokes in one session do not crash or freeze the canvas',
    { tag: ['@performance', '@regression'] },
    async ({ user, page }) => {
      test.setTimeout(10 * 60 * 1000);
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      const before = await user.toolbar.pathCount();

      await user.toolbar.selectTool('gtPen');
      for (let i = 0; i < 520; i++) {
        const col = i % 40;
        const row = Math.floor(i / 40);
        await user.content.rapidStroke(
          { x: 150 + col * 30, y: 250 + row * 45 },
          { x: 170 + col * 30, y: 275 + row * 45 }
        );
      }
      const drawn = (await user.toolbar.pathCount()) - before;
      test.info().annotations.push({ type: 'note', description: `Strokes registered: ${drawn} of 520` });

      // Not frozen: it still takes a further stroke, promptly.
      const started = Date.now();
      // Inside the client's real window (1536px wide), clear of the grid of strokes above and of the toolbar on the right.
      await user.toolbar.penStroke({ x: 1355, y: 300 }, { x: 1405, y: 340 });
      expect(Date.now() - started, 'still responsive').toBeLessThan(15000);
      expect(await user.toolbar.pathCount()).toBeGreaterThan(before + drawn);
      expect(errors, 'no uncaught page errors').toEqual([]);
    }
  );

  test(
    'WB-06-12: the same account drawing in two tabs at once does not lose either tab’s strokes on reload',
    { tag: ['@concurrency'] },
    async ({ user, page }) => {
      // A second sign-in plus two reloads takes longer than the 90s default.
      test.setTimeout(3 * 60 * 1000);
      const { browser, tab: tab2 } = await openSecondSession();
      const second = new App(tab2);
      try {
        await tab2.goto('./');
        await second.login.avatar.waitFor({ state: 'visible', timeout: 20000 }).catch(async () => second.signIn());
        await second.toolbar.waitForBoardToSettle();

        const before = await user.toolbar.pathCount();
        await Promise.all([
          user.toolbar.penStroke({ x: 300, y: 300 }, { x: 500, y: 360 }),
          second.toolbar.penStroke({ x: 300, y: 600 }, { x: 500, y: 660 }),
        ]);
        await Promise.all([user.content.waitForSaved(), second.content.waitForSaved()]);

        await Promise.all([
          reloadApp(user),
          (async () => {
            await tab2.reload();
            await second.login.avatar.waitFor({ state: 'visible', timeout: 20000 });
            await second.toolbar.waitForBoardToSettle();
          })(),
        ]);

        expect(await user.toolbar.pathCount(), 'tab 1 after reload has both strokes').toBeGreaterThanOrEqual(
          before + 2
        );
        expect(await second.toolbar.pathCount(), 'tab 2 after reload has both strokes').toBeGreaterThanOrEqual(
          before + 2
        );
      } finally {
        await browser.close();
      }
    }
  );

  test(
    'WB-06-13: the same account open in two tabs, both actively used, does not destabilise either',
    { tag: ['@concurrency'] },
    async ({ user, page }) => {
      test.setTimeout(5 * 60 * 1000);
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      const { browser, tab: tab2 } = await openSecondSession();
      tab2.on('pageerror', (err) => errors.push(err.message));
      const second = new App(tab2);
      try {
        await tab2.goto('./');
        await second.login.avatar.waitFor({ state: 'visible', timeout: 20000 }).catch(async () => second.signIn());
        await second.toolbar.waitForBoardToSettle();

        for (let round = 0; round < 12; round++) {
          await Promise.all([
            user.toolbar.penStroke({ x: 300 + round * 30, y: 300 }, { x: 340 + round * 30, y: 380 }),
            second.toolbar.penStroke({ x: 300 + round * 30, y: 600 }, { x: 340 + round * 30, y: 680 }),
          ]);
        }

        for (const app of [user, second]) {
          await expect(app.toolbar.container).toBeVisible();
          await expect(app.login.avatar).toBeVisible();
          const before = await app.toolbar.pathCount();
          // Empty spot inside the client's real window (1536px wide): clear of the rounds' strokes and the toolbar.
          await app.toolbar.penStroke({ x: 1000, y: 450 }, { x: 1060, y: 500 });
          expect(await app.toolbar.pathCount(), 'still responsive').toBeGreaterThan(before);
        }
        expect(errors, 'no uncaught page errors in either tab').toEqual([]);
      } finally {
        await browser.close();
      }
    }
  );
});
