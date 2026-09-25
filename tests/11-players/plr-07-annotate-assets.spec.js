// PLR-07 — Annotate on Playlist assets
// Source: CEPV2_Stories/11_Players.md
// The story applies to any asset opened from the Playlist. The Worksheet (PDF) is used as the representative asset:
// it is the player with a confirmed annotation layer (svg.annotation-layer), and the toolbar's pen/eraser/pan tools
// act on that layer while it is open. Annotations are drawn with real pointer events over the open asset.

const { test, expect } = require('../../fixtures');

test.describe('PLR-07 Annotate on Playlist assets', () => {
  test.use({ classMap: 'playersDefault' });

  const openWorksheet = async (user) => {
    await expect(user.player.worksheetCards.first()).toBeAttached({ timeout: 10000 });
    await user.player.openResourceCard(user.player.worksheetCards);
    expect(await user.player.isPlayerOpen(), 'the asset opened').toBe(true);
    // isPlayerOpen() only proves the close icon exists — not that the PDF occupies a real amount of screen. A
    // collapsed player would otherwise surface here only as a confusing stroke-count/geometry mismatch further
    // down. CONFIRMED LIVE elsewhere in this suite: a correctly-opened worksheet canvas is 1200+px tall.
    const rendered = user.player.worksheetHeader.or(user.page.locator('canvas').first());
    await expect
      .poll(async () => (await rendered.first().boundingBox())?.width || 0, {
        message: 'the worksheet finishes rendering to a real size',
        timeout: 20000,
      })
      .toBeGreaterThan(150);
    await user.page.waitForTimeout(2500);
    await clearAnnotations(user);
  };

  // Annotations are saved with the asset and pile up across tests and runs (30+ strokes were found stacked in one spot,
  // so an "empty" spot was not empty and counts drifted). The eraser panel's "Clear annotations" wipes them at once, with
  // no confirmation (CONFIRMED LIVE: 34 -> 0), so every test starts from, and leaves, a clean asset.
  const clearAnnotations = async (user) => {
    await user.toolbar.openToolPanel('gtErase');
    await user.toolbar.eraserClearAnnotationsBtn.click({ force: true, timeout: 5000 }).catch(() => {});
    await user.page.waitForTimeout(1200);
    await user.toolbar.closePanelByTappingOutside();
  };

  test.afterEach(async ({ user }) => {
    if (await user.player.isPlayerOpen(1500)) await clearAnnotations(user).catch(() => {});
  });

  const strokes = (user) => user.player.worksheetAnnotationLayer.first().locator('path');
  const geometry = (user) => strokes(user).evaluateAll((els) => els.map((e) => e.getAttribute('d')));

  /** Drag across the open asset, `dx`/`dy` from a point in its middle. */
  const drag = async (user, { offsetX = 0, offsetY = 0, dx = 200, dy = 60 } = {}) => {
    // CONFIRMED LIVE: the annotation layer is ONE tall svg spanning the whole multi-page document (1229 x 5234), so its
    // centre is far below the window (y ~ 2650 in an 864px-high window) and a drag from there is off-screen. Start from
    // the centre of the part of the layer that is actually visible.
    const box = await user.player.worksheetAnnotationLayer.first().boundingBox();
    const viewH = await user.page.evaluate(() => window.innerHeight);
    const visibleTop = Math.max(box.y, 0);
    const visibleBottom = Math.min(box.y + box.height, viewH);
    const startX = box.x + box.width / 2 + offsetX;
    const startY = (visibleTop + visibleBottom) / 2 + offsetY;
    await user.page.mouse.move(startX, startY);
    await user.page.mouse.down();
    for (let i = 1; i <= 12; i++) await user.page.mouse.move(startX + (dx * i) / 12, startY + (dy * i) / 12);
    await user.page.mouse.up();
    await user.page.waitForTimeout(600);
  };
  const annotate = async (user, opts) => {
    await user.toolbar.selectTool('gtPen');
    const before = await strokes(user).count();
    await drag(user, opts);
    // CONFIRMED LIVE (same as ToolbarPage.penStroke): the first pen stroke right after switching tools can silently not
    // register -- verify a stroke landed and retry once if not.
    if ((await strokes(user).count()) === before) {
      await user.page.waitForTimeout(500);
      await drag(user, opts);
    }
  };

  test(
    'PLR-07-01: the user can write an annotation on an asset opened from the Playlist',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await openWorksheet(user);
      const before = await strokes(user).count();

      await annotate(user);
      await expect(strokes(user), 'an annotation stroke was added to the asset').toHaveCount(before + 1);
    }
  );

  test('PLR-07-02: annotating with different colours works correctly', { tag: ['@functional'] }, async ({ user }) => {
    await openWorksheet(user);
    const tb = user.toolbar;
    await tb.openToolPanel('gtPen');
    const colours = Math.min(await tb.penColorOptions.count(), 3);
    await tb.closePanelByTappingOutside();
    expect(colours, 'more than one pen colour').toBeGreaterThan(1);

    const seen = [];
    for (let i = 0; i < colours; i++) {
      await tb.openToolPanel('gtPen');
      await tb.penColorOptions.nth(i).click({ force: true });
      await tb.closePanelByTappingOutside();
      await drag(user, { offsetY: i * 60 - 60 });
      seen.push((await tb.strokeOf(strokes(user).last())).color);
    }
    expect(new Set(seen).size, 'each colour draws in its own colour').toBe(colours);
  });

  test(
    'PLR-07-03: annotating with different thicknesses works correctly',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openWorksheet(user);
      const tb = user.toolbar;
      const widths = [];
      for (const [i, label] of ['Thin', 'Normal', 'Thick', 'Strong'].entries()) {
        await tb.openToolPanel('gtPen');
        await tb.panel.getByText(label, { exact: true }).click({ force: true });
        await tb.closePanelByTappingOutside();
        await drag(user, { offsetY: i * 50 - 75 });
        widths.push((await tb.strokeOf(strokes(user).last())).width);
      }
      for (let i = 1; i < widths.length; i++)
        expect(widths[i], `thickness ${i + 1} is heavier than ${i}`).toBeGreaterThan(widths[i - 1]);
    }
  );

  test(
    'PLR-07-04: panning the asset while annotations exist does not affect their placement',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openWorksheet(user);
      await annotate(user);
      const before = await geometry(user);
      expect(before.length).toBeGreaterThan(0);

      await user.toolbar.selectTool('gtPan');
      await drag(user, { offsetX: -100, offsetY: 150, dx: 150, dy: 80 });

      expect(await geometry(user), 'the annotation stayed attached to the asset, in the same place on it').toEqual(
        before
      );
    }
  );

  test(
    'PLR-07-05: erasing an annotation on an asset removes it correctly',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openWorksheet(user);
      const before = await strokes(user).count();
      await annotate(user, { dx: 200, dy: 0 });
      await expect(strokes(user)).toHaveCount(before + 1);

      await user.toolbar.selectTool('gtErase');
      await drag(user, { offsetX: -20, dx: 240, dy: 0 }); // straight back across it
      await expect.poll(() => strokes(user).count()).toBe(before);
    }
  );

  test(
    'PLR-07-06: erasing on an asset with no existing annotation does nothing and does not error',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await openWorksheet(user);
      const before = await geometry(user);

      await user.toolbar.selectTool('gtErase');
      await drag(user, { offsetX: 100, offsetY: 120, dx: 200, dy: 40 });

      expect(await geometry(user), 'nothing changed').toEqual(before);
      expect(await user.player.isPlayerOpen(3000), 'the asset is still open').toBe(true);
      expect(errors, 'no uncaught page errors').toEqual([]);
    }
  );
});
