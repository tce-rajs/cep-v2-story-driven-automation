// WB-01 — Canvas
// Source: CEPV2_Stories/06_Whiteboard.md

const { test, expect } = require('../../fixtures');

test.use({ cleanBoard: true });

test.describe('WB-01 Canvas', () => {
  test(
    'WB-01-01: the canvas loads and accepts drawing input correctly',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await expect(user.toolbar.wbContainer).toBeVisible();
      await expect(user.toolbar.wbSvg).toBeVisible();

      const before = await user.toolbar.waitForBoardToSettle();
      await user.toolbar.penStroke({ x: 350, y: 300 }, { x: 650, y: 380 });
      expect(await user.toolbar.pathCount()).toBe(before + 1);
    }
  );

  test(
    'WB-01-02: resizing the window does not lose or misalign existing canvas content',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      const tb = user.toolbar;
      await tb.penStroke({ x: 350, y: 300 }, { x: 650, y: 380 });
      const geometry = await user.content.pathGeometry();
      const count = await tb.pathCount();
      const originalSize = page.viewportSize() || (await user.header.viewportSize());

      // The window can only be resized programmatically where the page supports viewport emulation.
      const resized = await page
        .setViewportSize({ width: 1280, height: 720 })
        .then(() => true)
        .catch(() => false);
      test.skip(!resized, 'this window cannot be resized programmatically');

      try {
        await page.waitForTimeout(1000);
        expect(await tb.pathCount(), 'no content lost').toBe(count);
        expect(await user.content.pathGeometry(), 'content geometry unchanged').toEqual(geometry);

        // Not misaligned: the canvas still covers the (smaller) window and the stroke is still inside it.
        const viewport = await user.header.viewportSize();
        const stroke = await tb.lastPathBox();
        expect(stroke.x).toBeGreaterThanOrEqual(0);
        expect(stroke.x + stroke.width).toBeLessThanOrEqual(viewport.width);
        expect(stroke.y + stroke.height).toBeLessThanOrEqual(viewport.height);
      } finally {
        await page.setViewportSize({ width: originalSize.width, height: originalSize.height }).catch(() => {});
      }
    }
  );
});
