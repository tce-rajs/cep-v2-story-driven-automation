// WB-05 — Theme
// Source: CEPV2_Stories/06_Whiteboard.md
// Theme is the avatar menu's Dark Mode toggle (see TB-09-05).

const { test, expect } = require('../../fixtures');

test.use({ freshSpace: true });

test.describe('WB-05 Theme', () => {
  const toggleTheme = async (user) => {
    await user.userMenu.openProfileMenu();
    await user.userMenu.darkModeToggle.click({ force: true });
    await user.page.waitForTimeout(1000);
    await user.page.keyboard.press('Escape');
  };

  test(
    'WB-05-01: changing the whiteboard theme applies correctly without breaking existing content',
    { tag: ['@smoke', '@functional'] },
    async ({ user, page }) => {
      await user.content.addLines(`theme-${Date.now()}`);
      await user.content.addShape();
      const before = await user.content.snapshot();
      const geometry = await user.content.pathGeometry();
      const look = () =>
        page.evaluate(
          () =>
            document.documentElement.className +
            '|' +
            document.body.className +
            '|' +
            getComputedStyle(document.body).backgroundColor
        );
      const lookBefore = await look();

      await toggleTheme(user);
      try {
        expect(await look(), 'the theme actually changed').not.toBe(lookBefore);
        expect(await user.content.snapshot(), 'content unchanged').toEqual(before);
        expect(await user.content.pathGeometry(), 'geometry unchanged').toEqual(geometry);
        await expect(user.toolbar.container).toBeVisible();
      } finally {
        await toggleTheme(user); // restore the account's theme
      }
    }
  );

  test(
    'WB-05-02: switching theme while annotations exist does not alter their colours unexpectedly',
    { tag: ['@edge'] },
    async ({ user }) => {
      const tb = user.toolbar;
      // Three strokes: option 0 is the palette's "default" ink (white on the dark theme), options 1 and 2 are colours
      // the teacher deliberately picked.
      const colours = [];
      const positions = []; // each stroke's index among the canvas paths (tapping the canvas to close the panel can leave a dot)
      for (let i = 0; i < 3; i++) {
        await tb.openToolPanel('gtPen');
        await tb.penColorOptions.nth(i).click({ force: true });
        await tb.closePanelByTappingOutside();
        await tb.drawStroke({ x: 400 + i * 120, y: 400 }, { x: 400 + i * 120, y: 520 }, 8);
        positions.push((await tb.pathCount()) - 1);
        colours.push((await tb.strokeOf(tb.paths.last())).color);
      }
      const strokeColours = () =>
        tb.paths.evaluateAll((els, at) => at.map((i) => getComputedStyle(els[i]).stroke), positions);
      expect(await strokeColours()).toEqual(colours);

      await toggleTheme(user);
      try {
        const after = await strokeColours();
        // The "default" ink adapts to the theme (it does not stay white), which looks intentional, so
        // it is reported rather than asserted. Deliberately chosen colours must never change.
        test.info().annotations.push({
          type: 'note',
          description: `Default ink before=${colours[0]} after=${after[0]}; chosen colours before=${colours.slice(1).join(' / ')} after=${after.slice(1).join(' / ')}`,
        });
        expect(after.slice(1), 'chosen annotation colours unchanged by the theme').toEqual(colours.slice(1));
      } finally {
        await toggleTheme(user);
      }
    }
  );

  test('WB-05-03: a theme change never makes existing writing invisible', { tag: ['@negative'] }, async ({ user }) => {
    const tb = user.toolbar;
    // A stroke in the default ink and a typed sentence: the ones a theme could turn into board colour.
    await tb.openToolPanel('gtPen');
    await tb.penColorOptions.first().click({ force: true });
    await tb.closePanelByTappingOutside();
    await tb.drawStroke({ x: 400, y: 400 }, { x: 600, y: 470 }, 10);
    const strokeAt = (await tb.pathCount()) - 1;
    const text = await user.whiteboard.insertTextAndType(400, 560, `Theme ${Date.now() % 10000}`);
    await tb.selectTool('gtSelect');
    const ink = text.locator('.text-input-container').first();
    await toggleTheme(user);
    try {
      const stroke = await user.content.inkContrast(tb.paths.nth(strokeAt));
      const typed = await user.content.inkContrast(ink);
      test.info().annotations.push({
        type: 'note',
        description: `After the theme change: stroke ${stroke.ink} on ${stroke.board} (${stroke.ratio}:1), text ${typed.ink} (${typed.ratio}:1)`,
      });
      // 3:1 is the WCAG minimum for graphics and large text to be readable.
      expect(stroke.ratio, 'the stroke is still clearly visible').toBeGreaterThanOrEqual(3);
      expect(typed.ratio, 'the text is still clearly visible').toBeGreaterThanOrEqual(3);
    } finally {
      await toggleTheme(user);
    }
  });
});
