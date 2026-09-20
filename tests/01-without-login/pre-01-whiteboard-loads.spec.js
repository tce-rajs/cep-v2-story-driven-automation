// PRE-01 — Whiteboard loads by default without logging in
// Source: CEPV2_Stories/01_WithoutLogin.md

const { test, expect } = require('../../fixtures/electron-app');
const { WithoutLoginPage } = require('../../pages/without-login.page');

test.describe('PRE-01 Whiteboard loads by default without logging in', () => {
  test(
    'PRE-01-01: opening the app without logging in loads the whiteboard by default',
    { tag: ['@smoke', '@positive'] },
    async ({ page }) => {
      const app = new WithoutLoginPage(page);
      await app.open();

      await expect(page).toHaveURL(/\/teach\/whiteboard/);
      await expect(app.toolbar.wbContainer).toBeVisible();
      await expect(app.toolbar.wbSvg).toBeVisible();
      await expect(app.toolbar.container).toBeVisible();
    }
  );

  test(
    'PRE-01-02: no login prompt or redirect interrupts the load',
    { tag: ['@smoke', '@negative'] },
    async ({ page }) => {
      const app = new WithoutLoginPage(page);
      await app.open();
      await app.startWatchingForLoginPrompt();

      // Let any delayed redirect/prompt (a timer-driven one, say) have its chance.
      await page.waitForTimeout(3000);

      const report = await app.loginPromptReport();
      expect(report.urlLeftWhiteboard, 'URL must stay on /whiteboard').toBe(false);
      expect(report.loginPromptSeen, 'sign-in panel must not be opened by the app itself').toBe(false);
      await expect(page).toHaveURL(/\/teach\/whiteboard/);
      await expect(app.loginModal).not.toHaveClass(/login-modal-outer--active/);
      expect(await app.canvasIsUncovered(), 'nothing may cover the whiteboard canvas').toBe(true);
    }
  );
});
