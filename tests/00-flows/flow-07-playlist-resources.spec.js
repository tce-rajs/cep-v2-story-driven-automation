// FLOW-07 — Using the lesson's resources from the Playlist
// Source: CEPV2_Stories/00_EndToEndFlows.md
// Data (config/moduleClassMap.js): 'playersDefault' (second account, Class 12A Computer Science 2.2: video, worksheet,
// image, code, quiz), 'ebook' (Class 11A Mathematics), 'playersWeblink' (Class 12A Physics 1.1) and
// 'librarySuggestions' (Class 12A Physics 1.5), where AI Assist makes the flashcards this server has no curriculum copy
// of. Annotations are saved with an asset and are never wiped: each check looks only at the strokes it drew itself.
// Resources a test adds (an image, a text file, a flashcard) are removed again at the end.

const { test, expect } = require('../../fixtures');
const { boardStrokes, uniqueCopy } = require('./flow-helpers');

/** Open the first worksheet and wait for the PDF to render at a real size. */
const openWorksheet = async (user) => {
  await expect(user.player.worksheetCards.first(), 'set-up: a worksheet in the topic').toBeAttached({ timeout: 15000 });
  await user.player.openResourceCard(user.player.worksheetCards);
  expect(await user.player.isPlayerOpen(), 'the worksheet opens').toBe(true);
  const rendered = user.player.worksheetHeader.or(user.page.locator('canvas').first());
  await expect
    .poll(async () => (await rendered.first().boundingBox())?.width || 0, {
      message: 'the PDF renders at a real size',
      timeout: 20000,
    })
    .toBeGreaterThan(150);
  await user.page.waitForTimeout(2000);
};
const annotationStrokes = (user) =>
  user.player.worksheetAnnotationLayer
    .first()
    .locator('path')
    .evaluateAll((els) => els.map((e) => e.getAttribute('d')));
/** One pen stroke across the visible part of the open worksheet's annotation layer; returns its outline. */
const annotateWorksheet = async (user) => {
  await user.toolbar.selectTool('gtPen');
  const before = await annotationStrokes(user);
  const drag = async () => {
    const box = await user.player.worksheetAnnotationLayer.first().boundingBox();
    const viewH = await user.page.evaluate(() => window.innerHeight);
    const y = (Math.max(box.y, 0) + Math.min(box.y + box.height, viewH)) / 2;
    const x = box.x + box.width / 2 - 100;
    await user.page.mouse.move(x, y);
    await user.page.mouse.down();
    for (let i = 1; i <= 12; i++) await user.page.mouse.move(x + i * 18, y + Math.sin(i) * 10);
    await user.page.mouse.up();
    await user.page.waitForTimeout(800);
  };
  await drag();
  if ((await annotationStrokes(user)).length === before.length) await drag();
  const added = (await annotationStrokes(user)).filter((d) => !before.includes(d));
  expect(added.length, 'an annotation stroke is on the worksheet').toBeGreaterThan(0);
  return added[0];
};

test.describe('FLOW-07 Using the lesson’s resources from the Playlist', () => {
  test.describe.configure({ timeout: 180000 });

  test.afterEach(async ({ app }) => {
    await app.player.closePlayer().catch(() => {});
  });

  test.describe('players in the lesson topic', () => {
    test.use({ classMap: 'playersDefault' });

    test(
      "FLOW-07-01: the playlist lists the topic's resources",
      { tag: ['@smoke', '@functional'] },
      async ({ user }) => {
        const titles = await user.playlist.cardTitles();
        expect(titles.length, 'resources are listed').toBeGreaterThan(0);
        expect(
          titles.filter((t) => !t),
          'every card has a title'
        ).toEqual([]);
        const types = await user.playlist.cardTypes();
        expect(
          types.filter((t) => !t),
          'every card shows its type'
        ).toEqual([]);
      }
    );

    test('FLOW-07-02: a video plays, pauses and seeks', { tag: ['@smoke', '@functional'] }, async ({ user }) => {
      const p = user.player;
      await expect(p.videoCards.first(), 'set-up: a video in the topic').toBeAttached({ timeout: 10000 });
      await p.openResourceCard(p.videoCards);
      expect(await p.isPlayerOpen(), 'the video opens').toBe(true);
      await expect.poll(async () => (await p.videoState()).readyState, { timeout: 20000 }).toBeGreaterThanOrEqual(3);
      await p.toggleVideoPlayback();
      await expect
        .poll(async () => (await p.videoState()).currentTime, { message: 'it plays', timeout: 15000 })
        .toBeGreaterThan(0.5);
      await p.toggleVideoPlayback();
      await expect.poll(async () => (await p.videoState()).paused, { message: 'it pauses', timeout: 10000 }).toBe(true);
      const { duration } = await p.videoState();
      await p.videoElement.evaluate((v, t) => (v.currentTime = t), duration / 2);
      await expect
        .poll(async () => Math.round((await p.videoState()).currentTime), { message: 'it seeks to the middle' })
        .toBeGreaterThanOrEqual(Math.floor(duration / 2) - 1);
    });

    test(
      'FLOW-07-04: a PDF worksheet opens and can be written on',
      { tag: ['@smoke', '@functional'] },
      async ({ user }) => {
        await openWorksheet(user);
        await annotateWorksheet(user);
      }
    );

    test('FLOW-07-05: an image opens and can be zoomed', { tag: ['@functional'] }, async ({ user, page }) => {
      // The topic's own image card is a stale asset whose file 404s, so the test adds a real image and removes it again.
      const title = `AutoTest-image-${Date.now()}`;
      await user.addResource.createAsset(title, uniqueCopy('positive/diagram-1920x1080.png'));
      const card = user.playlist.resourceCards.filter({ hasText: title });
      try {
        await expect(card, 'set-up: the image is in the Playlist').toHaveCount(1, { timeout: 20000 });
        await user.player.openResourceCard(card);
        const img = user.player.imageGalleryImg.or(user.player.imageWrapper.locator('img')).first();
        await expect(img, 'the image opens').toBeVisible({ timeout: 15000 });
        const before = await img.boundingBox();
        // Zoom the way a teacher would: Ctrl + wheel over the image, or the player's own zoom-in control if it has one.
        const zoomIn = page
          .locator('.image-player [class*="zoom-in" i], .image-player [aria-label*="zoom in" i]')
          .first();
        if (await zoomIn.isVisible().catch(() => false)) await zoomIn.click();
        else {
          await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
          await page.keyboard.down('Control');
          await page.mouse.wheel(0, -600);
          await page.keyboard.up('Control');
        }
        await expect
          .poll(async () => (await img.boundingBox()).width, { message: 'the image is shown larger', timeout: 5000 })
          .toBeGreaterThan(before.width * 1.1);
      } finally {
        await user.player.closePlayer().catch(() => {});
        await user.playlist.ensureDrawerVisible();
        if (await card.count()) await user.playlist.removeOwnedAsset(card).catch(() => {});
      }
    });

    test(
      'FLOW-07-08: annotations on an asset are there when the asset is opened again',
      { tag: ['@functional'] },
      async ({ user }) => {
        await openWorksheet(user);
        const stroke = await annotateWorksheet(user);
        await user.page.waitForTimeout(3000); // let the annotation save
        await user.player.closePlayer();
        await user.playlist.ensureDrawerVisible();
        await openWorksheet(user);
        await expect
          .poll(() => annotationStrokes(user), { message: 'the annotation is back', timeout: 15000 })
          .toContain(stroke);
      }
    );

    test(
      'FLOW-07-09: closing a player returns to the board with its content',
      { tag: ['@functional'] },
      async ({ user }) => {
        await user.toolbar.waitForBoardToSettle();
        const board = (await boardStrokes(user)).sort();
        await openWorksheet(user);
        await user.player.closePlayer();
        expect(await user.player.isPlayerOpen(3000), 'the player is closed').toBe(false);
        await expect(user.toolbar.wbSvg, 'back on the board').toBeVisible();
        expect((await boardStrokes(user)).sort(), 'with its content').toEqual(board);
      }
    );

    test('FLOW-07-10: Pin keeps a resource at hand', { tag: ['@functional'] }, async ({ user, page }) => {
      const pl = user.playlist;
      const first = (await pl.cardTitles())[0];
      const state = async () => (await pl.pinBtn.locator('mat-icon').getAttribute('class')) || '';
      const unpinned = await state();
      await pl.pinBtn.click();
      try {
        await expect.poll(state, { message: 'the strip is pinned' }).not.toBe(unpinned);
        for (let i = 0; i < 3; i++) await pl.rightScrollBtn.click({ force: true }).catch(() => {});
        for (let i = 0; i < 3; i++) await pl.leftScrollBtn.click({ force: true }).catch(() => {});
        expect((await pl.cardTitles())[0], 'the pinned resource stays first').toBe(first);
        await page.reload();
        await user.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
        await pl.ensureDrawerVisible();
        await expect.poll(async () => (await pl.cardTitles())[0], { message: 'and after a reload' }).toBe(first);
      } finally {
        if ((await state()) !== unpinned) await pl.pinBtn.click().catch(() => {});
      }
    });

    test('FLOW-07-10: Contents jumps to the right part', { tag: ['@functional'] }, async ({ user }) => {
      await user.playlist.openContentsPopup();
      await expect(user.playlist.contentsPopup, 'Contents opens').toBeVisible({ timeout: 10000 });
      await user.playlist.topicItems.first().waitFor({ state: 'visible', timeout: 10000 });
      const count = await user.playlist.topicItems.count();
      const target = user.playlist.topicItems.nth(count > 1 ? 1 : 0);
      const name = (await target.innerText())
        .replace(/^article\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      await target.click();
      await user.nav._closeChaptersPopupIfOpen();
      await expect(user.nav.currentChapterTopicBtn, 'the chosen part is open').toContainText(
        name.replace(/^\d+(\.\d+)?\s*\|?\s*/, '').slice(0, 20),
        { timeout: 15000 }
      );
    });

    test(
      'FLOW-07-11: the Playlist filter shows only the chosen resource types',
      { tag: ['@functional'] },
      async ({ user }) => {
        const pl = user.playlist;
        await pl.openOptionsMenu();
        const total = await pl.filterOptions.count();
        let checked = false;
        try {
          for (let keep = 0; keep < total && !checked; keep++) {
            if ((await pl.filterToOnlyType(keep)) > 0) {
              expect(new Set(await pl.cardTypes()).size, 'only the chosen type is shown').toBe(1);
              checked = true;
            }
          }
          expect(checked, 'set-up: a type with resources to filter to').toBe(true);
        } finally {
          // Tick every type again.
          await pl.openOptionsMenu();
          for (let i = 0; i < total; i++)
            if ((await pl.filterOptions.nth(i).getAttribute('aria-selected')) !== 'true')
              await pl.filterOptions.nth(i).click();
          await pl.closeOptionsMenu();
        }
      }
    );

    test('FLOW-07-12: double-clicking a resource opens it once', { tag: ['@negative'] }, async ({ user, page }) => {
      await expect(user.player.videoCards.first()).toBeAttached({ timeout: 10000 });
      await user.player.videoCards.first().evaluate((el) => {
        el.scrollIntoView({ block: 'center' });
        el.click();
        el.click();
      });
      await page.waitForTimeout(6000);
      expect(await page.frameLocator('iframe').locator('video').count(), 'one player').toBeLessThanOrEqual(1);
      expect(await user.player.closeIcon.count(), 'one close button').toBeLessThanOrEqual(1);
    });

    test(
      'FLOW-07-13: a file the player cannot show gives a clear message, not a blank screen',
      { tag: ['@negative'] },
      async ({ user, page }) => {
        const title = `AutoTest-unsupported-${Date.now()}`;
        await user.addResource.createTextAsset(title);
        const card = user.playlist.resourceCards.filter({ hasText: title });
        try {
          await expect(card, 'set-up: the file is in the Playlist').toHaveCount(1, { timeout: 20000 });
          await user.player.openResourceCard(card);
          await expect(
            page.getByText(/unsupported file|cannot be (shown|played|opened)/i).first(),
            'a clear message'
          ).toBeVisible({
            timeout: 15000,
          });
        } finally {
          await user.player.closePlayer().catch(() => {});
          await user.playlist.ensureDrawerVisible();
          if (await card.count()) await user.playlist.removeOwnedAsset(card).catch(() => {});
        }
      }
    );
  });

  test.describe('the e-book', () => {
    test.use({ classMap: 'ebook' });

    test('FLOW-07-03: an ebook opens and pages can be turned', { tag: ['@functional'] }, async ({ user }) => {
      const p = user.player;
      await p.ebookTriggerBtn.click({ force: true });
      await expect(p.ebookLaunchBtn.first(), 'set-up: an e-book for the class').toBeVisible({ timeout: 10000 });
      await p.ebookLaunchBtn.first().click({ force: true });
      expect(await p.isPlayerOpen(), 'the ebook opens').toBe(true);
      await expect(p.ebookChapterItems.first(), 'its contents').toBeAttached({ timeout: 20000 });
      if ((await p.ebookChapterItems.filter({ visible: true }).count()) === 0)
        await p.domClick(p.ebookChapterDrawerToggle);
      await p.domClick(p.ebookChapterItems.nth(1));
      await expect(p.ebookChapterItems.nth(1), 'turned to the next part').toHaveClass(/selected/, { timeout: 20000 });
    });
  });

  test.describe('the web link', () => {
    test.use({ classMap: 'playersWeblink' });

    test('FLOW-07-06: a web link opens', { tag: ['@functional'] }, async ({ user }) => {
      await expect(user.player.weblinkCards.first(), 'set-up: a web link in the topic').toBeAttached({
        timeout: 10000,
      });
      await user.player.openResourceCard(user.player.weblinkCards);
      await expect(user.player.weblinkWrapper, 'the web link opens').toBeVisible({ timeout: 15000 });
      expect(await user.player.weblinkIframe.getAttribute('src'), 'showing the linked page').toMatch(/^https?:\/\//);
    });
  });

  test.describe('flashcards', () => {
    test.use({ classMap: 'librarySuggestions' });

    test('FLOW-07-07: flashcards open and turn', { tag: ['@functional'] }, async ({ user, page }) => {
      test.setTimeout(240000);
      const ar = user.addResource;
      const flashcards = () => user.playlist.resourceCards.filter({ hasText: /flashcard/i });
      const made = () => user.playlist.resourceCards.filter({ hasText: /my exercise|flashcard/i });
      const before = await flashcards().count();
      // AI Assist -> Exercise: two questions make a "<topic> FlashCard" deck.
      await ar.openAction('aiAssist');
      await expect(ar.aiAssistTabExercise).toBeVisible({ timeout: 20000 });
      await ar.selectExercise(0);
      await ar.selectExercise(1);
      await ar.aiAssistAddToPlaylistBtn.click({ force: true });
      await page.waitForTimeout(4000);
      await ar.aiAssistCloseBtn.click({ force: true, timeout: 3000 }).catch(() => {});
      await user.playlist.ensureDrawerVisible();
      try {
        await expect(flashcards(), 'set-up: a flashcard deck in the Playlist').toHaveCount(before + 1, {
          timeout: 15000,
        });
        await user.player.openResourceCard(flashcards().last());
        await expect(user.player.flashcardContainer, 'the flashcards open').toBeVisible({ timeout: 15000 });
        const first = await user.player.flashcardContainer.innerText();
        await user.player.flashcardNextArrow.first().click({ force: true });
        await expect
          .poll(() => user.player.flashcardContainer.innerText(), { message: 'the card turns' })
          .not.toBe(first);
      } finally {
        await user.player.closePlayer().catch(() => {});
        for (let i = 0; i < 6 && (await made().count()) > 0; i++) {
          await user.playlist.ensureDrawerVisible();
          await user.playlist.removeOwnedAsset(made().first()).catch(() => {});
          await page.waitForTimeout(1000);
        }
      }
    });
  });
});
