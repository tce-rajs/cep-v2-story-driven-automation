// WB-02 — Zoom
// Source: CEPV2_Stories/06_Whiteboard.md

const { test, expect } = require('../../fixtures');

test.describe('WB-02 Zoom', () => {
  // WB-02-01 is one story covering both directions; each direction is its own test so a zoom-in failure does not hide
  // whether zoom-out works (and vice versa). Both start from the reset (default) zoom level.
  for (const direction of ['in', 'out']) {
    const button = direction === 'in' ? 'zoomInBtn' : 'zoomOutBtn';

    test(
      `WB-02-01: zooming ${direction} changes the canvas view without distorting existing content`,
      { tag: ['@smoke', '@functional'] },
      async ({ user }) => {
        const tb = user.toolbar;
        await tb.penStroke({ x: 400, y: 400 }, { x: 600, y: 480 });
        const geometry = await user.content.pathGeometry();
        const sizeBefore = await tb.lastPathBox();
        const percentBefore = await user.content.zoomPercent();

        try {
          await tb.openToolPanel('gtZoom');
          for (let i = 0; i < 2; i++) await tb[button].click({ force: true });
          await tb.closePanelByTappingOutside();

          const percentAfter = await user.content.zoomPercent();
          const sizeAfter = await tb.lastPathBox();
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
  }

  test(
    'WB-02-02: zooming to the maximum or minimum limit does not break the canvas',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      const tb = user.toolbar;
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await tb.penStroke({ x: 400, y: 400 }, { x: 600, y: 480 });
      const geometry = await user.content.pathGeometry();

      await tb.openToolPanel('gtZoom');
      // Push well past any limit; the level must stop rising rather than run away.
      let last = -1;
      for (let i = 0; i < 40; i++) await tb.zoomInBtn.click({ force: true, timeout: 2000 }).catch(() => {});
      const max = await user.content.zoomPercent();
      for (let i = 0; i < 5; i++) await tb.zoomInBtn.click({ force: true, timeout: 2000 }).catch(() => {});
      last = await user.content.zoomPercent();
      expect(last, 'zoom in stops at a maximum').toBe(max);

      for (let i = 0; i < 60; i++) await tb.zoomOutBtn.click({ force: true, timeout: 2000 }).catch(() => {});
      const min = await user.content.zoomPercent();
      for (let i = 0; i < 5; i++) await tb.zoomOutBtn.click({ force: true, timeout: 2000 }).catch(() => {});
      expect(await user.content.zoomPercent(), 'zoom out stops at a minimum').toBe(min);
      test.info().annotations.push({ type: 'note', description: `Zoom limits: min=${min}%, max=${max}%` });

      await tb.zoomResetBtn.click({ force: true });
      await tb.closePanelByTappingOutside();
      await expect(tb.wbSvg).toBeVisible();
      expect(await user.content.pathGeometry(), 'content survived the extremes').toEqual(geometry);
      expect(errors, 'no uncaught page errors').toEqual([]);
    }
  );
});
