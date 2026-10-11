// HDR-04 — Toolbar Position
// Source: CEPV2_Stories/04_Header.md
// Toggling the position: it moves (HDR-04-01), an open panel survives (HDR-04-03), the toolbar still works from the
// new side (HDR-04-04) -- one test each. Each puts the toolbar back where it was.

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

  test(
    'HDR-04-05: the chosen toolbar side is kept after the app reloads',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await withToggledDock(user, async () => {
        const moved = await user.header.dockedSide();
        await page.reload();
        await user.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
        await expect
          .poll(() => user.header.dockedSide(), { message: 'the toolbar is on the chosen side', timeout: 10000 })
          .toBe(moved);
      });
    }
  );

  test(
    'HDR-04-06: the toolbar never ends up off screen or covering the header after changing its side',
    { tag: ['@negative'] },
    async ({ user }) => {
      const overlaps = (a, b) =>
        a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      await withToggledDock(user, async () => {
        const { width, height } = await user.header.viewportSize();
        const bar = await user.toolbar.container.boundingBox();
        expect(bar, 'the toolbar is shown').not.toBeNull();
        expect(bar.x, 'not off the left edge').toBeGreaterThanOrEqual(0);
        expect(bar.y, 'not off the top edge').toBeGreaterThanOrEqual(0);
        expect(bar.x + bar.width, 'not off the right edge').toBeLessThanOrEqual(width + 1);
        expect(bar.y + bar.height, 'not off the bottom edge').toBeLessThanOrEqual(height + 1);
        for (const [name, el] of [
          ['logo', user.header.logoContainer],
          ['version', user.header.versionText],
          ['date and time', user.header.calendar],
        ]) {
          const box = await el.boundingBox();
          expect(box && overlaps(bar, box), `the toolbar does not cover the header ${name}`).toBe(false);
        }
        // Every tool button is on screen, so each can still be reached.
        const tools = await user.toolbar.allTools.evaluateAll(
          (els, vh) =>
            els.filter((e) => {
              const r = e.getBoundingClientRect();
              return r.width > 0 && (r.top < 0 || r.bottom > vh);
            }).length,
          height
        );
        expect(tools, 'no tool button is cut off').toBe(0);
      });
    }
  );
});
