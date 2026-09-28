// MM-02 — See where the current view is on the board
// Source: CEPV2_Stories/12_Minimap.md
// The viewport rectangle and content markers are painted on the Minimap canvas; see MinimapPage.readCanvas().

const { test, expect } = require('../../fixtures');

test.use({ cleanBoard: true });

async function setZoom(user, clicksIn, clicksOut = 0) {
  const tb = user.toolbar;
  await tb.openToolPanel('gtZoom');
  for (let i = 0; i < clicksIn; i++) await tb.zoomInBtn.click({ force: true });
  for (let i = 0; i < clicksOut; i++) await tb.zoomOutBtn.click({ force: true });
  await tb.closePanelByTappingOutside();
}

test.describe('MM-02 See where the current view is on the board', () => {
  test.afterEach(async ({ app }) => {
    await app.minimap.close().catch(() => {});
    await app.toolbar.openToolPanel('gtZoom').catch(() => {});
    await app.toolbar.zoomResetBtn.click({ force: true, timeout: 3000 }).catch(() => {});
    await app.toolbar.closePanelByTappingOutside().catch(() => {});
  });

  test(
    'MM-02-01: the Minimap shows a marker for content already on the whiteboard',
    { tag: ['@functional'] },
    async ({ user }) => {
      await user.minimap.open(user.toolbar);
      const empty = await user.minimap.readCanvas();
      await user.minimap.close();

      await user.toolbar.penStroke({ x: 400, y: 400 }, { x: 700, y: 480 });
      await user.minimap.open(user.toolbar);
      await expect
        .poll(async () => (await user.minimap.readCanvas()).content, { message: 'a content marker appears' })
        .toBeGreaterThan(empty.content + 20);
    }
  );

  test(
    'MM-02-02: zooming the main canvas resizes the viewport rectangle and updates the zoom percentage',
    { tag: ['@functional'] },
    async ({ user }) => {
      await user.minimap.open(user.toolbar);
      const before = await user.minimap.readCanvas();
      const pctBefore = await user.minimap.zoomPercent();

      await setZoom(user, 2);
      await expect
        .poll(() => user.minimap.zoomPercent(), { message: 'Minimap percentage went up' })
        .toBeGreaterThan(pctBefore);
      expect(await user.minimap.zoomPercent(), 'Minimap percentage matches the main zoom').toBe(
        await user.content.zoomPercent()
      );
      const after = await user.minimap.readCanvas();
      expect(after.rect.width, 'zooming in shrinks the viewport rectangle').toBeLessThan(before.rect.width);
    }
  );

  test(
    'MM-02-03: panning the main canvas moves the Minimap viewport rectangle',
    { tag: ['@bug', '@functional'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232): panning the main canvas with the Pan tool (content moved
      // 400px) leaves the Minimap's viewport rectangle where it was; it only updates on zoom or on a click inside the Minimap.
      test.fail(true, 'The Minimap viewport rectangle does not follow a pan made with the Pan tool');
      await setZoom(user, 2); // zoomed in, so the view has room to move
      await user.minimap.open(user.toolbar);
      const before = (await user.minimap.readCanvas()).rect;

      await user.toolbar.selectTool('gtPan');
      await user.toolbar.drawStroke({ x: 900, y: 600 }, { x: 500, y: 400 }, 12);
      // The Minimap redraws a moment after the pan.
      await expect
        .poll(
          async () => {
            const after = (await user.minimap.readCanvas()).rect;
            return after.x !== before.x || after.y !== before.y;
          },
          { message: 'the rectangle moved' }
        )
        .toBe(true);
    }
  );

  test(
    'MM-02-04: opening the Minimap on an empty whiteboard shows an empty overview without an error',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await user.minimap.open(user.toolbar);
      const drawn = await user.minimap.readCanvas();
      expect(drawn.rect, 'viewport rectangle still drawn').not.toBeNull();
      expect(errors).toEqual([]);
    }
  );

  test(
    'MM-02-05: rapid zoom in/out while the Minimap is open leaves its percentage matching the real zoom',
    { tag: ['@edge'] },
    async ({ user }) => {
      await user.minimap.open(user.toolbar);
      const tb = user.toolbar;
      await tb.openToolPanel('gtZoom');
      for (let i = 0; i < 6; i++) {
        await tb.zoomInBtn.click({ force: true });
        await tb.zoomOutBtn.click({ force: true });
        await tb.zoomInBtn.click({ force: true });
      }
      await tb.closePanelByTappingOutside();
      await expect
        .poll(async () => (await user.minimap.zoomPercent()) === (await user.content.zoomPercent()), {
          message: 'Minimap percentage equals the main zoom',
          timeout: 5000,
        })
        .toBe(true);
    }
  );

  test(
    'MM-02-06: at minimum and maximum zoom the viewport rectangle stays inside the Minimap frame',
    { tag: ['@edge'] },
    async ({ user }) => {
      await user.minimap.open(user.toolbar);
      for (const [label, clicksIn, clicksOut] of [
        ['maximum', 12, 0],
        ['minimum', 0, 12],
      ]) {
        await setZoom(user, clicksIn, clicksOut);
        const drawn = await user.minimap.readCanvas();
        expect(drawn.rect, `rectangle drawn at ${label} zoom`).not.toBeNull();
        expect(drawn.rect.x, `${label}: left edge inside`).toBeGreaterThanOrEqual(0);
        expect(drawn.rect.y, `${label}: top edge inside`).toBeGreaterThanOrEqual(0);
        expect(drawn.rect.x + drawn.rect.width, `${label}: right edge inside`).toBeLessThanOrEqual(drawn.width);
        expect(drawn.rect.y + drawn.rect.height, `${label}: bottom edge inside`).toBeLessThanOrEqual(drawn.height);
      }
    }
  );
});
