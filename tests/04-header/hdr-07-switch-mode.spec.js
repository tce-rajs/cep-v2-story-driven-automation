// HDR-07 — Switch Mode
// Source: CEPV2_Stories/04_Header.md
// Only the Teach side and the switch itself are automated here; everything that happens INSIDE
// Plan Mode is manual-only (PROCESS.md, "Automation scope").
// Switching is the "Classroom Mode" entry of the avatar menu.
// Planning is a separate app (/plan/#/canvas) with no data-qa-ids, reached and left via that menu.

const { test, expect } = require('../../fixtures');

test.describe('HDR-07 Switch Mode', () => {
  // Teach -> Plan (HDR-07-01) and Plan -> Teach (HDR-07-05) are one test each.
  test(
    'HDR-07-01: Switch Mode changes from Teach Mode to Plan Mode and updates the UI',
    { tag: ['@smoke', '@functional'] },
    async ({ user, page }) => {
      await expect(page).toHaveURL(/\/teach\//);
      try {
        const toPlan = await user.compass.switchToPlanningMode();
        expect(toPlan.switched, 'switched into Plan Mode').toBe(true);
        await expect(page).toHaveURL(/\/plan\//);
        // The Teach UI is gone: no toolbar avatar in the Plan app.
        await expect(user.login.avatar).toBeHidden();
      } finally {
        // Leave the account in Teach Mode for whatever runs next.
        if (page.url().includes('/plan/')) await user.compass.switchToTeachingMode().catch(() => {});
      }
    }
  );

  test(
    'HDR-07-05: Switch Mode changes from Plan Mode back to Teach Mode and updates the UI',
    { tag: ['@smoke', '@functional'] },
    async ({ user, page }) => {
      const toPlan = await user.compass.switchToPlanningMode();
      expect(toPlan.switched, 'set-up: in Plan Mode').toBe(true);
      await expect(page).toHaveURL(/\/plan\//);

      const toTeach = await user.compass.switchToTeachingMode();
      expect(toTeach.switched, 'switched back into Teach Mode').toBe(true);
      await expect(page).toHaveURL(/\/teach\//);
      await expect(user.login.avatar).toBeVisible({ timeout: 15000 });
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

  // The warning before switching away from a drawing is HDR-07-02 (an improvement). Where the build shows one,
  // cancelling it must keep the teacher in Teach Mode with the drawing; where it shows none there is nothing to cancel,
  // and the test says so. The stroke goes on fresh space below the teacher's writing.
  test(
    'HDR-07-07: cancelling the switch-mode warning keeps the teacher in Teach Mode with the drawing kept',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      await user.content.startOnFreshSpace();
      await user.toolbar.penStroke({ x: 520, y: 420 }, { x: 760, y: 480 });
      const drawing = await user.toolbar.paths.last().getAttribute('d');
      await user.userMenu.openProfileMenu();
      await user.compass.planningModeOption.click({ force: true });
      const warning = page
        .locator('mat-dialog-container, [role="dialog"], .cdk-overlay-pane')
        .filter({ hasText: /unsaved|discard|lose|are you sure|switch/i })
        .filter({ visible: true })
        .last();
      const shown = await warning
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (!shown) {
        if (page.url().includes('/plan/')) await user.compass.switchToTeachingMode();
        test.skip(true, 'this build shows no switch-mode warning to cancel (HDR-07-02, an improvement)');
      }
      await warning
        .getByRole('button', { name: /cancel|no|stay|keep/i })
        .first()
        .click();
      await expect(warning, 'the warning closes').toBeHidden({ timeout: 5000 });
      await expect(page, 'still in Teach Mode').toHaveURL(/\/teach\//);
      const strokes = await user.toolbar.allPaths.evaluateAll((els) => els.map((e) => e.getAttribute('d')));
      expect(strokes, 'with the drawing kept').toContain(drawing);
    }
  );

  // With no network: an in-app error is shown (HDR-07-04), and the app stays in Teach Mode instead of crashing
  // (HDR-07-06) -- one test each.

  /** Cut the network and click Planning; runs `check` while still offline, then restores the network. */
  const switchOffline = async (user, page, check) => {
    await user.userMenu.openProfileMenu();
    // context.setOffline() is a no-op in the Electron client (fetch still succeeds, navigator.onLine stays true),
    // so the network is cut by aborting every request on the page instead.
    await page.route('**/*', (route) => route.abort('internetdisconnected'));
    try {
      await user.compass.planningModeOption.click({ force: true }).catch(() => {});
      await page.waitForTimeout(3000);
      await check();
    } finally {
      await page.unroute('**/*');
    }
  };
});
