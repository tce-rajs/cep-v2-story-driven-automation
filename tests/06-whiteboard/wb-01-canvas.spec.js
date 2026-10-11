// WB-01 — Canvas
// Source: CEPV2_Stories/06_Whiteboard.md

const { test, expect } = require('../../fixtures');

test.use({ freshSpace: true });

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

  // Data: 'longSession' (12A Physics 3.1), a board that holds writing from every long run and is never cleared.
  // Read-only here.
  test.describe('a topic with content', () => {
    test.use({ classMap: 'longSession', freshSpace: false });

    test(
      'WB-01-03: the board never opens blank or grey when the topic has content',
      { tag: ['@negative'] },
      async ({ user, page }) => {
        await expect(user.toolbar.wbSvg, 'the board is shown').toBeVisible();
        await expect
          .poll(() => user.toolbar.allPaths.count(), { message: 'the writing on this topic loads', timeout: 60000 })
          .toBeGreaterThan(0);
        // Not blank: some of the writing is on screen where the board opens.
        const inView = await user.toolbar.allPaths.evaluateAll(
          (els) =>
            els.filter((e) => {
              const r = e.getBoundingClientRect();
              return (
                r.width + r.height > 0 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight
              );
            }).length
        );
        expect(inView, 'writing is visible on the opened board').toBeGreaterThan(0);
        // Not grey: no loading veil or overlay covers the board.
        const covered = await page.evaluate(() => {
          const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
          return !(el && el.closest('[data-qa-id="wb-drawing-container"]'));
        });
        expect(covered, 'nothing covers the board').toBe(false);
        const ink = await user.content.inkContrast(user.toolbar.allPaths.first());
        expect(ink.ratio, `the writing stands out from the board (${ink.ink} on ${ink.board})`).toBeGreaterThan(1.5);
      }
    );
  });
});
