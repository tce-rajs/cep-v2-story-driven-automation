// PRE-04 — Whiteboard is usable for all core actions
// Source: CEPV2_Stories/01_WithoutLogin.md

const { test, expect } = require('../../fixtures/electron-app');
const { WithoutLoginPage } = require('../../pages/without-login.page');

test.describe('PRE-04 Whiteboard is usable for all core actions', () => {
  test.beforeEach(async ({ page }) => {
    await new WithoutLoginPage(page).open();
  });

  test('PRE-04-01: the user can draw on the whiteboard', { tag: ['@smoke', '@positive'] }, async ({ page }) => {
    const app = new WithoutLoginPage(page);
    const before = await app.toolbar.pathCount();
    await app.draw();
    expect(await app.toolbar.pathCount()).toBe(before + 1);
  });

  test('PRE-04-02: the user can erase drawn content', { tag: ['@smoke', '@positive'] }, async ({ page }) => {
    const app = new WithoutLoginPage(page);
    const before = await app.toolbar.pathCount();
    await app.draw();
    expect(await app.toolbar.pathCount()).toBe(before + 1);

    await app.eraseAcross();
    await expect.poll(() => app.toolbar.pathCount()).toBe(before);
  });

  test('PRE-04-03: the user can add a shape', { tag: ['@smoke', '@positive'] }, async ({ page }) => {
    const app = new WithoutLoginPage(page);
    const before = await app.toolbar.pathCount();
    await app.addRectangleAt();
    expect(await app.toolbar.pathCount()).toBe(before + 1);
  });

  test('PRE-04-04: the user can add a text box', { tag: ['@smoke', '@positive'] }, async ({ page }) => {
    const app = new WithoutLoginPage(page);
    const wb = app.whiteboard;
    const before = await wb.textObjects.count();
    const textBox = await wb.insertTextAndType(400, 600, 'Hello');

    await expect(wb.textObjects).toHaveCount(before + 1);
    await expect(textBox).toContainText('Hello');
  });

  // Opening, using and closing a widget are one test each (split 2026-09-28): PRE-04-05, PRE-04-07, PRE-04-08.
  const openClock = async (app) => {
    await app.openWidgets();
    await app.toolbar.widgetTool('Clock').click({ force: true });
  };

  test('PRE-04-05: the user can open a widget', { tag: ['@smoke', '@positive'] }, async ({ page }) => {
    const app = new WithoutLoginPage(page);
    await openClock(app);
    await expect(app.clockWidget).toBeVisible();
    await expect(app.clockShowTimeBtn).toBeVisible();
  });

  test('PRE-04-07: the user can use an open widget', { tag: ['@positive'] }, async ({ page }) => {
    const app = new WithoutLoginPage(page);
    await openClock(app);
    await expect(app.clockWidget, 'set-up: the Clock is open').toBeVisible();
    // Set the hour, then press Show Time -- the widget must stay up and keep the value.
    await app.clockHourInput.fill('3');
    await app.clockShowTimeBtn.click({ force: true });
    await expect(app.clockHourInput).toHaveValue('3');
    await expect(app.clockWidget).toBeVisible();
  });

  test('PRE-04-08: the user can close an open widget', { tag: ['@positive'] }, async ({ page }) => {
    const app = new WithoutLoginPage(page);
    await openClock(app);
    await expect(app.clockWidget, 'set-up: the Clock is open').toBeVisible();
    await app.clockCloseBtn.click({ force: true });
    await expect(app.clockWidget).toHaveCount(0);
  });

  test(
    'PRE-04-06: none of these actions trigger an unexpected login prompt',
    { tag: ['@smoke', '@negative'] },
    async ({ page }) => {
      const app = new WithoutLoginPage(page);
      await app.startWatchingForLoginPrompt();

      await app.draw();
      await app.eraseAcross();
      await app.addRectangleAt();
      await app.whiteboard.insertTextAndType(400, 600, 'Hi');
      await app.openWidgets();
      await app.toolbar.widgetTool('Clock').click({ force: true });
      await expect(app.clockWidget).toBeVisible();
      await page.waitForTimeout(1500);

      const report = await app.loginPromptReport();
      expect(report.loginPromptSeen, 'sign-in panel must never activate').toBe(false);
      expect(report.urlLeftWhiteboard, 'URL must stay on /whiteboard').toBe(false);
      await expect(app.loginModal).not.toHaveClass(/login-modal-outer--active/);
    }
  );
});
