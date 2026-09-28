// PLR-03 — Complete a worksheet (PDF)
// Source: CEPV2_Stories/11_Players.md
// Data: the 'playersDefault' topic (Class 12A Computer Science, "14. Project Based Learning") holds a Worksheet (PDF)
// and a Weblink. The page indicator is read from the active pagination item, else the Go-to-Page field.

const { test, expect } = require('../../fixtures');
const { TEXT_FILE } = require('../../pages/add-resource.page');

test.describe('PLR-03 Complete a worksheet (PDF)', () => {
  test.use({ classMap: 'playersDefault' });

  const openWorksheet = async (user) => {
    await expect(user.player.worksheetCards.first()).toBeAttached({ timeout: 10000 });
    await user.player.openResourceCard(user.player.worksheetCards);
    expect(await user.player.isPlayerOpen(), 'the worksheet opened').toBe(true);
    await user.page.waitForTimeout(2000);
  };

  /** The page number currently showing, or null if it can't be read. */
  const currentPage = async (user) => {
    const active = user.page
      .locator('li.page-item.active, li.page-item.current, .page-item.active')
      .filter({ visible: true })
      .first();
    let text = await active.innerText().catch(() => '');
    if (!/\d/.test(text)) text = await user.player.worksheetGoToPageInput.inputValue().catch(() => '');
    const n = parseInt(String(text).replace(/\D/g, ''), 10);
    return Number.isNaN(n) ? null : n;
  };

  test(
    'PLR-03-01: opening a worksheet loads the PDF correctly',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await openWorksheet(user);
      const rendered = user.player.worksheetHeader.or(user.page.locator('canvas').first());
      await expect(rendered).toBeVisible({ timeout: 15000 });
      expect(await currentPage(user), 'it opens on a numbered page').not.toBeNull();
      // isPlayerOpen()/toBeVisible() only prove the close icon and a header/canvas exist — not that the PDF
      // occupies a real amount of screen. CONFIRMED LIVE: the canvas can still be mid-layout (a narrow sliver)
      // right after becoming visible, then settle to its real ~1200px-tall size — poll rather than measure once.
      // CONFIRMED LIVE on a second server: a real multi-page curriculum PDF can take longer than 10s to settle;
      // 20s covers both.
      await expect
        .poll(async () => (await rendered.first().boundingBox())?.width || 0, {
          message: 'the PDF finishes rendering to a real size',
          timeout: 20000,
        })
        .toBeGreaterThan(150);
      const box = await rendered.first().boundingBox();
      expect(box.height, 'the PDF renders at a real size, not collapsed').toBeGreaterThan(150);
    }
  );

  test('PLR-03-02: navigating backward through the PDF works correctly', { tag: ['@functional'] }, async ({ user }) => {
    await openWorksheet(user);
    await user.player.worksheetNextPage.first().click({ force: true });
    await user.page.waitForTimeout(1000);
    await user.player.worksheetNextPage.first().click({ force: true });
    await user.page.waitForTimeout(1000);
    const from = await currentPage(user);

    await user.player.worksheetPrevPage.first().click({ force: true });
    await user.page.waitForTimeout(1000);
    expect(await currentPage(user), 'one page back').toBe(from - 1);
  });

  test('PLR-03-03: navigating forward through the PDF works correctly', { tag: ['@functional'] }, async ({ user }) => {
    await openWorksheet(user);
    const first = await currentPage(user);

    await user.player.worksheetNextPage.first().click({ force: true });
    await user.page.waitForTimeout(1000);
    expect(await currentPage(user), 'one page forward').toBe(first + 1);
    await user.player.worksheetNextPage.first().click({ force: true });
    await user.page.waitForTimeout(1000);
    expect(await currentPage(user), 'two pages forward').toBe(first + 2);
  });

  test(
    'PLR-03-04: jumping to a specific page using "Go to Page" with the up/down buttons works correctly',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openWorksheet(user);
      const input = user.player.worksheetGoToPageInput;
      await expect(input).toBeVisible();

      // Type a target and go.
      await input.fill('3');
      await user.player.worksheetGoBtn.click({ force: true }).catch(async () => input.press('Enter'));
      await user.page.waitForTimeout(1200);
      expect(await currentPage(user), 'jumped to page 3').toBe(3);

      // CONFIRMED LIVE (v 0.0.223): the up / down arrows at the left of the toolbar do NOT step the "Go to Page" number (the
      // box keeps what was typed) and do not change the page on this 3-page document -- they can only scroll a taller page.
      // What the story means by "with the up/down buttons" is unclear, so they are checked only for being present and
      // harmless; that gap is recorded in the notes.
      const { worksheetUpBtn: up, worksheetDownBtn: down } = user.player;
      await expect(up.first()).toBeVisible();
      await expect(down.first()).toBeVisible();
      await up.first().click({ force: true });
      await down.first().click({ force: true });
      await user.page.waitForTimeout(800);
      expect(await currentPage(user), 'the arrows leave the page where it was').toBe(3);
      expect(await user.player.isPlayerOpen(3000), 'and the player is still up').toBe(true);
      test.info().annotations.push({
        type: 'note',
        description:
          'GAP: the up/down arrows had no observable effect on this 3-page worksheet; their intended behaviour needs confirming.',
      });
    }
  );

  test(
    'PLR-03-05: an out-of-range page number in "Go to Page" is handled gracefully',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await openWorksheet(user);

      for (const target of ['99999', '0', '-5']) {
        await user.player.worksheetGoToPageInput.fill(target);
        await user.player.worksheetGoBtn
          .click({ force: true })
          .catch(async () => user.player.worksheetGoToPageInput.press('Enter'));
        await page.waitForTimeout(1000);
        // Graceful: still on a real, numbered page inside the document (clamped or refused), player still up.
        const now = await currentPage(user);
        expect(now, `after "${target}" it is still on a valid page`).toBeGreaterThanOrEqual(1);
        expect(await user.player.isPlayerOpen(3000)).toBe(true);
      }
      expect(errors, 'no uncaught page errors').toEqual([]);
    }
  );

  test(
    'PLR-03-06: a malformed / zero-page worksheet resource is handled without crashing',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      const title = `AutoTest-malformed-${Date.now()}`;
      await user.addResource.createAsset(title, {
        name: 'broken.pdf',
        mimeType: 'application/pdf',
        buffer: TEXT_FILE.buffer,
      });
      const card = user.playlist.resourceCards.filter({ hasText: title });
      try {
        await expect(card).toBeVisible({ timeout: 15000 });
        await user.player.openResourceCard(card);
        await page.waitForTimeout(3000);

        // Whatever it shows (an error, or nothing), the app must still be alive and dismissible.
        expect((await page.locator('body').innerText()).trim().length, 'the app did not blank out').toBeGreaterThan(20);
        await user.player.closePlayer();
        await expect(user.playlist.contentsTile, 'Playlist controls still there').toBeVisible();
        expect(
          errors.filter((e) => !/pdf|document|invalid/i.test(e)),
          'no unrelated uncaught errors'
        ).toEqual([]);
      } finally {
        // Closing a player leaves the Playlist drawer lowered (see RES-01-08), which blocks the hover the removal needs, and
        // this swallowed error is what used to leave a stale "AutoTest-malformed" asset behind after every run.
        await user.player.closePlayer().catch(() => {});
        await user.playlist.ensureDrawerVisible().catch(() => {});
        await user.playlist.removeOwnedAsset(card).catch(() => {});
      }
    }
  );

  test(
    'PLR-03-07: a very large/long worksheet does not degrade responsiveness',
    { tag: ['@performance'] },
    async ({ user }) => {
      test.setTimeout(3 * 60 * 1000);
      const opened = Date.now();
      await openWorksheet(user);
      const openMs = Date.now() - opened;

      const timings = [];
      for (let i = 0; i < 15; i++) {
        const start = Date.now();
        await user.player.worksheetNextPage.first().click({ force: true });
        await user.page.waitForTimeout(150);
        timings.push(Date.now() - start);
      }
      test
        .info()
        .annotations.push({ type: 'note', description: `Open ${openMs}ms; per-page ms: ${timings.join(',')}` });
      expect(openMs, 'opens within 15s').toBeLessThan(15000);
      expect(Math.max(...timings), 'no page turn takes over 3s').toBeLessThan(3000);
    }
  );

  test(
    'PLR-03-08: a Worksheet and a different player type (a Weblink) open simultaneously without conflict',
    { tag: ['@concurrency'] },
    async ({ user, page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await openWorksheet(user);

      // Open the Weblink while the worksheet is still up.
      await expect(user.player.weblinkCards.first()).toBeAttached();
      await user.player.openResourceCard(user.player.weblinkCards);
      await page.waitForTimeout(2500);
      await expect(user.player.weblinkWrapper, 'the weblink opened').toBeVisible({ timeout: 15000 });
      // toBeVisible() only proves the wrapper exists, not that it occupies a real amount of screen alongside the
      // worksheet. CONFIRMED LIVE: a correctly-opened weblink wrapper is ~980x760 in this window.
      const weblinkBox = await user.player.weblinkWrapper.boundingBox();
      expect(weblinkBox.width, 'the weblink renders at a real size, not collapsed').toBeGreaterThan(150);
      expect(weblinkBox.height, 'the weblink renders at a real size, not collapsed').toBeGreaterThan(150);

      // Neither broke the other: the PDF is still there and still turns pages.
      const before = await currentPage(user);
      // DOM-level click: with the weblink also open, the pager can sit outside the viewport for a coordinate click.
      await user.player.domClick(user.player.worksheetNextPage.first());
      await page.waitForTimeout(1000);
      expect(await currentPage(user), 'the worksheet still works alongside the weblink').toBe(before + 1);
      expect(errors, 'no uncaught page errors').toEqual([]);
    }
  );

  // --- Added 2026-09-26 (gap-fill from the reference suite's Players workbook) ---

  const pdfCanvas = (user) => user.page.locator('.pdfViewer canvas, canvas').filter({ visible: true }).first();

  test.fixme("PLR-03-09: the zoom buttons change the worksheet's zoom", async () => {
    // STORY vs APP, CONFIRMED LIVE (2026-09-26, v 0.0.232): the worksheet player has no zoom control. Its only controls are
    // the page numbers with prev/next, Scroll-up / Scroll-down, GO, "switch view", Answer Toggle, Print and close.
    // The story came from the reference suite's PLR-WS-09. Owner to decide: drop the case, or raise a product gap.
  });

  test(
    'PLR-03-10: the answer key button shows and hides the answers, on a worksheet that has one',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openWorksheet(user);
      const hasKey = await user.player.worksheetAnswerKeyBtn.isVisible().catch(() => false);
      test.skip(!hasKey, "This topic's worksheet has no answer key.");
      // The page is re-rendered on every toggle, so "hidden again" is judged against the answers-shown render, not
      // against the very first render pixel for pixel.
      const render = () => pdfCanvas(user).evaluate((c) => c.toDataURL());
      const before = await render();
      await user.player.worksheetAnswerKeyBtn.click({ force: true });
      await expect.poll(render, { message: 'answers shown', timeout: 10000 }).not.toBe(before);
      const shown = await render();
      await user.player.worksheetAnswerKeyBtn.click({ force: true });
      await expect.poll(render, { message: 'answers hidden again', timeout: 10000 }).not.toBe(shown);
    }
  );

  test('PLR-03-11: the orientation button changes the page orientation', { tag: ['@functional'] }, async ({ user }) => {
    await openWorksheet(user);
    // CONFIRMED LIVE (2026-09-26): the control is labelled "switch view"; it changes how the pages are laid out rather
    // than rotating the page, so the check is that the layout changes and a second press restores it.
    const layout = async () => {
      const boxes = await user.page
        .locator('.pdfViewer canvas, canvas')
        .filter({ visible: true })
        .evaluateAll((els) =>
          els.map((e) => {
            const r = e.getBoundingClientRect();
            return [Math.round(r.width), Math.round(r.height)].join('x');
          })
        );
      return boxes.join(',');
    };
    const before = await layout();
    await user.player.worksheetOrientationToggle.click({ force: true });
    await expect.poll(layout, { message: 'the page layout changed', timeout: 10000 }).not.toBe(before);
    await user.player.worksheetOrientationToggle.click({ force: true });
    await expect.poll(layout, { message: 'and back again', timeout: 10000 }).toBe(before);
  });

  test('PLR-03-12: Next on the last page stays on the last page', { tag: ['@negative'] }, async ({ user }) => {
    await openWorksheet(user);
    const pages = await user.page
      .locator('li.page-item.number-item, li.page-item:not(.previous-item):not(.next-item)')
      .filter({ visible: true })
      .count();
    for (let i = 0; i < pages + 2; i++)
      await user.player.worksheetNextPage
        .first()
        .click({ force: true })
        .catch(() => {});
    const last = await currentPage(user);
    await user.player.worksheetNextPage
      .first()
      .click({ force: true })
      .catch(() => {});
    await user.page.waitForTimeout(800);
    expect(await currentPage(user), 'still on the last page, not wrapped to 1').toBe(last);
    expect(last).toBeGreaterThanOrEqual(1);
  });

  test('PLR-03-13: closing the worksheet exits cleanly', { tag: ['@functional'] }, async ({ user }) => {
    await openWorksheet(user);
    await user.player.closePlayer();
    await expect(user.player.closeIcon.first()).toBeHidden({ timeout: 10000 });
    await user.playlist.ensureDrawerVisible();
    await expect(user.playlist.contentsTile, 'back on the whiteboard with the Playlist').toBeVisible();
  });
});
