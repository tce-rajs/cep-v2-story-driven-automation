// TB-03 — Background
// Source: CEPV2_Stories/05_Toolbar.md

const { test, expect } = require('../../fixtures');

// Counts and "last path" lookups see only this test's own strokes; the teacher's writing is kept (never cleared).
test.use({ freshSpace: true });

test.describe('TB-03 Background', () => {
  // Changing the background: it becomes the active one (TB-03-01), and existing content is untouched (TB-03-05) -- one
  // test each (split 2026-09-28). Every test leaves the board on the plain background.
  test(
    'TB-03-01: choosing a whiteboard background makes it the active background',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      try {
        await tb.chooseBackground('gtGraphCms');
        await tb.openToolPanel('gtBackground');
        await expect(tb.backgroundActive, 'chosen background is marked active').toHaveCount(1);
        await expect(tb.backgroundActive).toHaveAttribute('data-qa-id', 'toolbar-background-gtGraphCms');
        await tb.closePanelByTappingOutside();
      } finally {
        await tb.chooseBackground('gtBlankPage');
      }
    }
  );

  test(
    'TB-03-05: changing the whiteboard background does not affect existing content',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      await tb.penStroke({ x: 400, y: 400 }, { x: 600, y: 470 });
      const objectsBefore = await tb.objectCount();
      const geometryBefore = await tb.paths.last().getAttribute('d');
      try {
        await tb.chooseBackground('gtGraphCms');
        expect(await tb.objectCount(), 'no content lost or added').toBe(objectsBefore);
        await expect(tb.paths.last(), 'content unchanged').toHaveAttribute('d', geometryBefore);
      } finally {
        await tb.chooseBackground('gtBlankPage');
      }
    }
  );

  // A background chosen at random: every UI element is still visible (TB-03-02), and the board can still be drawn on
  // (TB-03-06) -- one test each (split 2026-09-28).
  const chooseRandomBackground = async (user) => {
    const tb = user.toolbar;
    await tb.openToolPanel('gtBackground');
    const ids = await tb.backgroundOptions.evaluateAll((els) =>
      els.map((e) => e.getAttribute('data-qa-id').replace('toolbar-background-', ''))
    );
    await tb.closePanelByTappingOutside();
    const pick = ids[Math.floor(Math.random() * ids.length)];
    test.info().annotations.push({ type: 'note', description: `Random background chosen: ${pick}` });
    await tb.chooseBackground(pick);
  };

  test(
    'TB-03-02: a randomly chosen background leaves every UI element visible',
    { tag: ['@functional'] },
    async ({ user }) => {
      await chooseRandomBackground(user);
      try {
        await expect(user.header.logoContainer).toBeVisible();
        await expect(user.header.calendar).toBeVisible();
        await expect(user.toolbar.container).toBeVisible();
        await expect(user.playlist.contentsTile).toBeVisible();
        await expect(user.addResource.addResourcesTrigger).toBeVisible();
        await expect(user.nav.currentClassBtn).toBeVisible();
      } finally {
        await user.toolbar.chooseBackground('gtBlankPage');
      }
    }
  );

  test(
    'TB-03-06: on a randomly chosen background the board can still be drawn on',
    { tag: ['@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      await chooseRandomBackground(user);
      try {
        const before = await tb.pathCount();
        await tb.penStroke({ x: 400, y: 400 }, { x: 560, y: 470 });
        expect(await tb.pathCount(), 'still drawable on this background').toBeGreaterThan(before);
      } finally {
        await tb.chooseBackground('gtBlankPage');
      }
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
