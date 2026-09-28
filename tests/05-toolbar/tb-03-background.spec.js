// TB-03 — Background
// Source: CEPV2_Stories/05_Toolbar.md

const { test, expect } = require('../../fixtures');

// Counts and "last path" lookups need a blank board, not the persisted content earlier tests left behind.
test.use({ cleanBoard: true });

test.describe('TB-03 Background', () => {
  test(
    'TB-03-01: changing the whiteboard background updates it without affecting existing content',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      await tb.penStroke({ x: 400, y: 400 }, { x: 600, y: 470 });
      const objectsBefore = await tb.objectCount();
      const geometryBefore = await tb.paths.last().getAttribute('d');

      await tb.chooseBackground('gtGraphCms');
      await tb.openToolPanel('gtBackground');
      await expect(tb.backgroundActive, 'chosen background is marked active').toHaveCount(1);
      await expect(tb.backgroundActive).toHaveAttribute('data-qa-id', 'toolbar-background-gtGraphCms');
      await tb.closePanelByTappingOutside();

      expect(await tb.objectCount(), 'no content lost or added').toBe(objectsBefore);
      await expect(tb.paths.last(), 'content unchanged').toHaveAttribute('d', geometryBefore);

      await tb.chooseBackground('gtBlankPage'); // leave the board as found
    }
  );

  test(
    'TB-03-02: a randomly chosen background leaves every UI element visible and usable',
    { tag: ['@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      await tb.openToolPanel('gtBackground');
      const ids = await tb.backgroundOptions.evaluateAll((els) =>
        els.map((e) => e.getAttribute('data-qa-id').replace('toolbar-background-', ''))
      );
      await tb.closePanelByTappingOutside();
      const pick = ids[Math.floor(Math.random() * ids.length)];
      test.info().annotations.push({ type: 'note', description: `Random background chosen: ${pick}` });

      await tb.chooseBackground(pick);

      // Not just "the background rendered": everything else must still be there and work.
      await expect(user.header.logoContainer).toBeVisible();
      await expect(user.header.calendar).toBeVisible();
      await expect(tb.container).toBeVisible();
      await expect(user.playlist.contentsTile).toBeVisible();
      await expect(user.addResource.addResourcesTrigger).toBeVisible();
      await expect(user.nav.currentClassBtn).toBeVisible();

      const before = await tb.pathCount();
      await tb.penStroke({ x: 400, y: 400 }, { x: 560, y: 470 });
      expect(await tb.pathCount(), 'still drawable on this background').toBeGreaterThan(before);

      await tb.chooseBackground('gtBlankPage');
    }
  );

  test(
    'TB-03-03: changing the background rapidly, many times in a row, does not crash or freeze the toolbar',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const tb = user.toolbar;
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await tb.openToolPanel('gtBackground');
      const options = await tb.backgroundOptions.count();
      for (let i = 0; i < 20; i++) {
        await tb.backgroundOptions
          .nth(i % options)
          .click({ force: true, timeout: 3000 })
          .catch(() => {});
        await page.waitForTimeout(100);
      }
      await tb.closePanelByTappingOutside();

      // Toolbar still alive and responsive.
      await tb.selectTool('gtPen');
      await expect(tb.isToolActive('gtPen')).toHaveCount(1);
      await tb.chooseBackground('gtBlankPage');
      expect(errors, 'no uncaught page errors').toEqual([]);
    }
  );

  test('TB-03-04: "No Background" puts back a plain background', { tag: ['@functional'] }, async ({ user }) => {
    const tb = user.toolbar;
    await tb.chooseBackground('gtGraphCms');
    await tb.openToolPanel('gtBackground');
    await expect(tb.backgroundActive).toHaveAttribute('data-qa-id', 'toolbar-background-gtGraphCms');
    await tb.noBackgroundOption.click({ force: true });
    await expect(tb.backgroundActive, 'No Background is the active choice').toHaveAttribute(
      'data-qa-id',
      'toolbar-background-gtBlankPage'
    );
    await tb.closePanelByTappingOutside();
    // Plain: no background pattern drawn behind the content.
    const pattern = await tb.wbContainer.evaluate((el) => {
      const bg = getComputedStyle(el).backgroundImage;
      const svgPattern = el.querySelector('pattern, [class*="background-pattern"], [class*="bg-pattern"]');
      return (bg && bg !== 'none' ? bg : '') + (svgPattern ? ' pattern-element' : '');
    });
    expect(pattern, 'no grid/ruled pattern left behind').toBe('');
  });
});
