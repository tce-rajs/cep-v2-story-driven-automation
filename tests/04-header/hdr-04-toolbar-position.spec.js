// HDR-04 — Toolbar Position
// Source: CEPV2_Stories/04_Header.md
// Toggling the position: it moves (HDR-04-01), an open panel survives (HDR-04-03), the toolbar still works from the
// new side (HDR-04-04) -- one test each (split 2026-09-28). Each puts the toolbar back where it was.

const { test, expect } = require('../../fixtures');

test.describe('HDR-04 Toolbar Position', () => {
  /** Toggle the dock side, run `body(startSide)`, and always toggle it back so the shared account is left as found. */
  const withToggledDock = async (user, body) => {
    const startSide = await user.header.dockedSide();
    expect(startSide, 'set-up: toolbar starts docked to exactly one side').not.toBe('ambiguous');
    await user.header.toggleDock();
    try {
      await body(startSide);
    } finally {
      await user.toolbar.closePanelByTappingOutside().catch(() => {});
      if ((await user.header.dockedSide()) !== startSide) await user.header.toggleDock();
    }
  };

  test(
    'HDR-04-01: toggling the toolbar position moves it to the other side',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await withToggledDock(user, async (startSide) => {
        const movedSide = await user.header.dockedSide();
        expect(movedSide, 'toolbar moved to the opposite side').not.toBe(startSide);
        expect(movedSide).not.toBe('ambiguous');
      });
    }
  );

  test(
    'HDR-04-03: toggling the toolbar position keeps an open panel open',
    { tag: ['@functional'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (v 0.0.223): the toolbar does move to the other side, but the open Pen panel
      // is closed by the move (visible before, not visible after) instead of surviving it. Tracked as
      // expected-to-fail so it isn't masked; needs a product decision on whether closing the panel is acceptable.
      test.fail(true, 'Moving the toolbar closes the open tool panel');
      await user.toolbar.openToolPanel('gtPen');
      await expect(user.toolbar.panel, 'set-up: the Pen panel is open').toBeVisible();
      await withToggledDock(user, async () => {
        await expect(user.toolbar.panel, 'the open panel survived the move').toBeVisible();
      });
    }
  );

  test(
    'HDR-04-04: after toggling the toolbar position, the toolbar still works from the new side',
    { tag: ['@functional'] },
    async ({ user }) => {
      await withToggledDock(user, async () => {
        const before = await user.toolbar.pathCount();
        await user.toolbar.penStroke({ x: 400, y: 400 }, { x: 600, y: 480 });
        expect(await user.toolbar.pathCount()).toBeGreaterThan(before);
      });
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
