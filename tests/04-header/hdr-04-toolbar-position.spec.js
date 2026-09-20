// HDR-04 — Toolbar Position
// Source: CEPV2_Stories/04_Header.md

const { test, expect } = require('../../fixtures');

test.describe('HDR-04 Toolbar Position', () => {
  test(
    'HDR-04-01: toggling the toolbar left/right moves it without breaking any open panel',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (v 0.0.223): the toolbar does move to the other side, but the open Pen panel
      // is closed by the move (visible before, not visible after) instead of surviving it. Tracked as
      // expected-to-fail so it isn't masked; needs a product decision on whether closing the panel is acceptable.
      test.fail(true, 'Moving the toolbar closes the open tool panel');
      const startSide = await user.header.dockedSide();
      expect(startSide, 'toolbar starts docked to exactly one side').not.toBe('ambiguous');

      await user.toolbar.openToolPanel('gtPen');
      await expect(user.toolbar.panel).toBeVisible();

      await user.header.toggleDock();
      const movedSide = await user.header.dockedSide();
      expect(movedSide, 'toolbar moved to the opposite side').not.toBe(startSide);
      expect(movedSide).not.toBe('ambiguous');
      await expect.soft(user.toolbar.panel, 'the open panel survived the move').toBeVisible();

      // Still working from the new side.
      await user.toolbar.closePanelByTappingOutside();
      const before = await user.toolbar.pathCount();
      await user.toolbar.penStroke({ x: 400, y: 400 }, { x: 600, y: 480 });
      expect(await user.toolbar.pathCount()).toBeGreaterThan(before);

      // Put it back so the shared board is left as found.
      await user.header.toggleDock();
      expect(await user.header.dockedSide()).toBe(startSide);
    }
  );

  test(
    'HDR-04-02: toggling the position rapidly, many times in a row, does not crash or freeze the toolbar',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));

      for (let i = 0; i < 12; i++) {
        await user.header.dockToggle.click({ force: true }).catch(() => {});
        await page.waitForTimeout(80);
      }
      await page.waitForTimeout(800);

      expect(await user.header.dockedSide(), 'settled cleanly on one side').not.toBe('ambiguous');
      // Not frozen: the toolbar still responds.
      await user.toolbar.selectTool('gtPen');
      await expect(user.toolbar.isToolActive('gtPen')).toHaveCount(1);
      expect(errors, 'no uncaught page errors').toEqual([]);
    }
  );
});
