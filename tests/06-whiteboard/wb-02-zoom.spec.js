// WB-02 — Zoom
// Source: CEPV2_Stories/06_Whiteboard.md

const { test, expect } = require('../../fixtures');

test.describe('WB-02 Zoom', () => {
  test(
    'WB-02-01: zooming in/out changes the canvas view without distorting existing content',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      await tb.penStroke({ x: 400, y: 400 }, { x: 600, y: 480 });
      const geometry = await user.content.pathGeometry();
      const sizeBefore = await tb.lastPathBox();
      const percentBefore = await user.content.zoomPercent();

      await tb.openToolPanel('gtZoom');
      await tb.zoomInBtn.click({ force: true });
      await tb.zoomInBtn.click({ force: true });
      await tb.closePanelByTappingOutside();

      const percentIn = await user.content.zoomPercent();
      const sizeIn = await tb.lastPathBox();
      expect(percentIn, 'zoom level went up').toBeGreaterThan(percentBefore);
      expect(sizeIn.width, 'content appears larger').toBeGreaterThan(sizeBefore.width);
      // Same shape, scaled uniformly: aspect ratio preserved, underlying geometry untouched.
      expect(sizeIn.width / sizeIn.height).toBeCloseTo(sizeBefore.width / sizeBefore.height, 1);
      expect(await user.content.pathGeometry()).toEqual(geometry);

      await tb.openToolPanel('gtZoom');
      await tb.zoomOutBtn.click({ force: true });
      await tb.zoomOutBtn.click({ force: true });
      await tb.zoomOutBtn.click({ force: true });
      await tb.closePanelByTappingOutside();
      expect(await user.content.zoomPercent(), 'zoom level went down').toBeLessThan(percentIn);
      expect(await user.content.pathGeometry()).toEqual(geometry);

      await tb.openToolPanel('gtZoom');
      await tb.zoomResetBtn.click({ force: true });
      await tb.closePanelByTappingOutside();
    }
  );

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
