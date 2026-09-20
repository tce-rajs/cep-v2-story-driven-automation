// HDR-07 — Switch Mode
// Source: CEPV2_Stories/04_Header.md
// Only the Teach side and the switch itself are automated here; everything that happens INSIDE
// Plan Mode is manual-only (PROCESS.md, "Automation scope").
// Switching is the "Classroom Mode" entry of the avatar menu. CONFIRMED LIVE in the previous suite:
// Planning is a separate app (/plan/#/canvas) with no data-qa-ids, reached and left via that menu.

const { test, expect } = require('../../fixtures');

test.describe('HDR-07 Switch Mode', () => {
  test(
    'HDR-07-01: Switch Mode changes between Teach Mode and Plan Mode and updates the UI',
    { tag: ['@smoke', '@functional'] },
    async ({ user, page }) => {
      await expect(page).toHaveURL(/\/teach\//);

      const toPlan = await user.compass.switchToPlanningMode();
      expect(toPlan.switched, 'switched into Plan Mode').toBe(true);
      await expect(page).toHaveURL(/\/plan\//);
      // The Teach UI is gone: no toolbar avatar in the Plan app.
      await expect(user.login.avatar).toBeHidden();

      const toTeach = await user.compass.switchToTeachingMode();
      expect(toTeach.switched, 'switched back into Teach Mode').toBe(true);
      await expect(page).toHaveURL(/\/teach\//);
      await expect(user.login.avatar).toBeVisible({ timeout: 15000 });
    }
  );

  test(
    'HDR-07-02: Switch Mode while an unsaved action is in progress warns before switching',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (v 0.0.223): switching with a stroke still in progress goes straight to Plan
      // Mode -- no native dialog and no in-page warning (switched=true, dialog=null, warning text=false). Tracked as
      // expected-to-fail so it isn't masked; needs a product decision.
      test.fail(true, 'Switch Mode mid-draw switches with no warning (silent discard)');
      let dialogMessage = null;
      page.on('dialog', async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.dismiss();
      });

      // Mid-draw: pointer is down and the stroke has not been finished.
      const box = await user.toolbar.wbSvg.boundingBox();
      await user.toolbar.selectTool('gtPen');
      await page.mouse.move(box.x + 400, box.y + 400);
      await page.mouse.down();
      await page.mouse.move(box.x + 500, box.y + 450, { steps: 5 });

      const attempt = await user.compass.switchToPlanningMode();
      await page.mouse.up().catch(() => {});

      const warningShown =
        dialogMessage !== null ||
        (await page
          .getByText(/unsaved|discard|lose (your )?(changes|work)|are you sure/i)
          .first()
          .isVisible({ timeout: 2000 })
          .catch(() => false));
      test.info().annotations.push({
        type: 'note',
        description: `switched=${attempt.switched}, native dialog=${dialogMessage}, warning text shown=${warningShown}`,
      });
      expect(warningShown, 'a warning appeared before the switch — not a silent discard').toBe(true);
    }
  );

  test(
    'HDR-07-03: rapid repeated Switch Mode clicking does not leave the app stuck between modes',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      await user.userMenu.openProfileMenu();
      for (let i = 0; i < 6; i++) {
        await user.compass.planningModeOption.click({ force: true, timeout: 1500 }).catch(() => {});
        await page.waitForTimeout(120);
      }
      await page.waitForTimeout(4000);

      // Settled in exactly one real mode, with content on screen -- not blank, not half-loaded.
      expect(page.url()).toMatch(/\/(teach|plan)\//);
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.trim().length, 'page has content').toBeGreaterThan(20);

      // Leave the account in Teach Mode for whatever runs next.
      if (page.url().includes('/plan/')) await user.compass.switchToTeachingMode();
    }
  );

  test(
    'HDR-07-04: switching mode with no network shows an appropriate error, not a silent failure or crash',
    { tag: ['@negative', '@interruption'] },
    async ({ user, page }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (v 0.0.223): with the network cut, clicking Planning does not show any
      // in-app error -- the window navigates to Chromium's own error page (chrome-error://chromewebdata/) and the
      // teach app is gone. Tracked as expected-to-fail so it isn't masked; needs a product decision.
      test.fail(true, 'Switch Mode with no network drops to a browser error page instead of an in-app error');
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await user.userMenu.openProfileMenu();
      // context.setOffline() is a no-op in the Electron client (fetch still succeeds, navigator.onLine stays true),
      // so the network is cut by aborting every request on the page instead.
      await page.route('**/*', (route) => route.abort('internetdisconnected'));
      try {
        await user.compass.planningModeOption.click({ force: true }).catch(() => {});
        await page.waitForTimeout(3000);

        // Still alive, still in Teach Mode...
        expect(page.url()).toContain('/teach/');
        expect((await page.locator('body').innerText()).trim().length).toBeGreaterThan(20);
        // ...and it told the user something went wrong.
        await expect(
          page.getByText(/offline|no (internet|network|connection)|unable to|couldn.?t|failed|try again/i).first()
        ).toBeVisible({ timeout: 5000 });
        expect(errors, 'no uncaught page errors').toEqual([]);
      } finally {
        await page.unroute('**/*');
      }
    }
  );
});
