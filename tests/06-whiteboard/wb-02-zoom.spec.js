// WB-02 — Zoom
// Source: CEPV2_Stories/06_Whiteboard.md
// One test per expected result: zoom in (01) and zoom out (03); the maximum (02) and the minimum (04) limit.

const { test, expect } = require('../../fixtures');

test.describe('WB-02 Zoom', () => {
  // Draw below the teacher's writing (never on top of it, never clearing it) and compare only this test's strokes.
  test.use({ freshSpace: true });

  // Both start from the account's current zoom level and reset it at the end.
  const zoomCase = (id, direction, button) =>
    test(
      `${id}: zooming ${direction} changes the canvas view without distorting existing content`,
      { tag: ['@smoke', '@functional'] },
      async ({ user }) => {
        const tb = user.toolbar;
        await tb.penStroke({ x: 400, y: 400 }, { x: 600, y: 480 });
        const geometry = await user.content.pathGeometry();
        // Measure THIS stroke by its own geometry, not "the last path": CONFIRMED LIVE 2026-09-29 the Zoom panel adds a
        // small icon path (M 611 380 L 619 380 ...) to the drawing SVG, which "the last path" can pick up instead.
        const mine = user.page.locator(`[data-qa-id="wb-drawing-container"] svg path[d="${geometry.at(-1)}"]`);
        const sizeBefore = await mine.boundingBox();
        const percentBefore = await user.content.zoomPercent();

        try {
          await tb.openToolPanel('gtZoom');
          for (let i = 0; i < 2; i++) await tb[button].click({ force: true });
          await tb.closePanelByTappingOutside();

          const percentAfter = await user.content.zoomPercent();
          const sizeAfter = await mine.boundingBox();
          if (direction === 'in') {
            expect(percentAfter, 'zoom level went up').toBeGreaterThan(percentBefore);
            expect(sizeAfter.width, 'content appears larger').toBeGreaterThan(sizeBefore.width);
          } else {
            expect(percentAfter, 'zoom level went down').toBeLessThan(percentBefore);
            expect(sizeAfter.width, 'content appears smaller').toBeLessThan(sizeBefore.width);
          }
          // Same shape, scaled uniformly: aspect ratio preserved, underlying geometry untouched.
          expect(sizeAfter.width / sizeAfter.height).toBeCloseTo(sizeBefore.width / sizeBefore.height, 1);
          expect(await user.content.pathGeometry(), 'content itself unchanged').toEqual(geometry);
        } finally {
          await tb.openToolPanel('gtZoom');
          await tb.zoomResetBtn.click({ force: true });
          await tb.closePanelByTappingOutside();
        }
      }
    );

  zoomCase('WB-02-01', 'in', 'zoomInBtn');
  zoomCase('WB-02-03', 'out', 'zoomOutBtn');

  // Push well past the limit; the level must stop changing rather than run away, and the canvas must survive it.
  const limitCase = (id, limit, button, clicks) =>
    test(
      `${id}: zooming to the ${limit} limit does not break the canvas`,
      { tag: ['@edge'] },
      async ({ user, page }) => {
        const tb = user.toolbar;
        const errors = [];
        page.on('pageerror', (err) => errors.push(err.message));
        await tb.penStroke({ x: 400, y: 400 }, { x: 600, y: 480 });
        const geometry = await user.content.pathGeometry();

        await tb.openToolPanel('gtZoom');
        try {
          for (let i = 0; i < clicks; i++) await tb[button].click({ force: true, timeout: 2000 }).catch(() => {});
          const reached = await user.content.zoomPercent();
          for (let i = 0; i < 5; i++) await tb[button].click({ force: true, timeout: 2000 }).catch(() => {});
          test.info().annotations.push({ type: 'note', description: `Zoom ${limit}: ${reached}%` });
          expect(await user.content.zoomPercent(), `the zoom level stops at a ${limit}`).toBe(reached);
        } finally {
          await tb.zoomResetBtn.click({ force: true });
          await tb.closePanelByTappingOutside();
        }
        await expect(tb.wbSvg).toBeVisible();
        expect(await user.content.pathGeometry(), 'content survived the extreme').toEqual(geometry);
        expect(errors, 'no uncaught page errors').toEqual([]);
      }
    );

  limitCase('WB-02-02', 'maximum', 'zoomInBtn', 40);
  limitCase('WB-02-04', 'minimum', 'zoomOutBtn', 60);
});
