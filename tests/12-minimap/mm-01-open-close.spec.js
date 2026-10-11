// MM-01 — Open and close the Minimap
// Source: CEPV2_Stories/12_Minimap.md

const { test, expect } = require('../../fixtures');

test.describe('MM-01 Open and close the Minimap', () => {
  test.afterEach(async ({ app }) => {
    await app.minimap.close().catch(() => {});
  });

  test(
    'MM-01-01: the Minimap opens from the Zoom control with an overview, viewport rectangle, zoom percentage, Reset View and Close',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await user.minimap.open(user.toolbar);
      await expect(user.minimap.canvas).toBeVisible();
      await expect(user.minimap.zoomLevel).toHaveText(/^\s*\d+%\s*$/);
      await expect(user.minimap.resetBtn).toBeVisible();
      await expect(user.minimap.closeBtn).toBeVisible();
      const drawn = await user.minimap.readCanvas();
      expect(drawn.rect, 'a viewport rectangle is drawn on the overview').not.toBeNull();
    }
  );

  test(
    'MM-01-02: Close hides the Minimap and leaves nothing behind on the whiteboard',
    { tag: ['@functional'] },
    async ({ user }) => {
      await user.minimap.open(user.toolbar);
      await user.minimap.closeBtn.click({ force: true });
      await user.minimap.waitOpen(false);
      // Closed = no `visible` class and faded to opacity 0 (the element itself stays in the page).
      await expect.poll(() => user.minimap.isShown(), { message: 'Minimap no longer shown' }).toBe(false);
    }
  );

  test(
    'MM-01-03: the Minimap is closed again after the app reloads',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await user.minimap.open(user.toolbar);
      await page.reload();
      await user.toolbar.wbSvg.waitFor({ state: 'visible', timeout: 30000 });
      expect(await user.minimap.isOpen(), 'Minimap not restored open after reload').toBe(false);
    }
  );

  // Opening and closing the Minimap 8 times quickly: one clean closed panel (MM-01-04), and it still opens normally
  // afterwards (MM-01-06) -- one test each.
  const openCloseEightTimes = async (user) => {
    // The Zoom panel closes once the Minimap opens, so each round goes through the full open path again.
    for (let i = 0; i < 8; i++) {
      await user.minimap.open(user.toolbar);
      await user.minimap.closeBtn.click({ force: true });
    }
  };

  test(
    'MM-01-04: opening and closing the Minimap 8 times quickly leaves one clean, closed panel',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await openCloseEightTimes(user);
      await expect(user.minimap.container, 'one panel, not duplicated').toHaveCount(1);
      await user.minimap.waitOpen(false);
      expect(errors, 'no uncaught page errors').toEqual([]);
    }
  );

  test(
    'MM-01-06: after opening and closing it 8 times quickly, the Minimap still opens normally',
    { tag: ['@edge'] },
    async ({ user }) => {
      await openCloseEightTimes(user);
      await user.minimap.open(user.toolbar);
      await expect(user.minimap.canvas).toBeVisible();
    }
  );

  // Data: 'longSession' (12A Physics 3.1), a board full of writing from the long runs. Read-only here.
  test.describe('on a board with content', () => {
    test.use({ classMap: 'longSession' });

    test(
      'MM-01-07: the Minimap never opens blank on a board that has content',
      { tag: ['@negative'] },
      async ({ user }) => {
        await expect
          .poll(() => user.toolbar.allPaths.count(), { message: 'set-up: the board has writing', timeout: 60000 })
          .toBeGreaterThan(0);
        await user.minimap.open(user.toolbar);
        // The overview is painted a moment after it opens.
        await expect
          .poll(async () => (await user.minimap.readCanvas()).content, {
            message: 'the overview shows the writing',
            timeout: 10000,
          })
          .toBeGreaterThan(20);
        expect((await user.minimap.readCanvas()).rect, 'and the viewport box').not.toBeNull();
      }
    );
  });
});
