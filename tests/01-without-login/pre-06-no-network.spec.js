// PRE-06 — Guest Mode keeps working without a network
// Source: CEPV2_Stories/01_WithoutLogin.md
// Each test opens the app fresh (no tool panel opened yet), then cuts the network for the client window
// (WithoutLoginPage.cutNetwork); the network is restored after every test.

const { test, expect } = require('../../fixtures/electron-app');
const { WithoutLoginPage } = require('../../pages/without-login.page');

test.describe('PRE-06 Guest Mode keeps working without a network', () => {
  test.beforeEach(async ({ page }) => {
    const app = new WithoutLoginPage(page);
    await app.open();
    await app.cutNetwork();
  });

  test.afterEach(async ({ page }) => {
    await new WithoutLoginPage(page).restoreNetwork();
  });

  test('PRE-06-01: drawing works with no network', { tag: ['@interruption'] }, async ({ page }) => {
    const app = new WithoutLoginPage(page);
    const before = await app.toolbar.pathCount();
    await app.draw();
    expect(await app.toolbar.pathCount(), 'the stroke is drawn').toBe(before + 1);
  });

  test('PRE-06-02: erasing works with no network', { tag: ['@interruption'] }, async ({ page }) => {
    const app = new WithoutLoginPage(page);
    const before = await app.toolbar.pathCount();
    await app.draw();
    expect(await app.toolbar.pathCount(), 'set-up: the stroke is drawn').toBe(before + 1);
    await app.eraseAcross();
    await expect.poll(() => app.toolbar.pathCount(), { message: 'the stroke is erased' }).toBe(before);
  });

  test(
    'PRE-06-03: no error message appears on the board while there is no network',
    { tag: ['@negative', '@interruption'] },
    async ({ page }) => {
      const app = new WithoutLoginPage(page);
      await app.draw();
      await app.whiteboard.insertTextAndType(400, 600, 'Lesson notes');
      await page.waitForTimeout(5000); // time for any failed background request to surface a message
      await expect(app.errorMessages.filter({ visible: true }), 'no error message').toHaveCount(0);
      expect(await app.canvasIsUncovered(), 'nothing covers the board').toBe(true);
    }
  );

  // One test per tool panel, each opened for the first time after the network is gone.
  const PANELS = [
    ['PRE-06-04', 'gtPen', 'the Pen panel shows its colours'],
    ['PRE-06-05', 'gtErase', 'the Eraser panel shows its options'],
    ['PRE-06-06', 'gtShapes', 'the Shapes panel shows its shapes'],
    ['PRE-06-07', 'gtBackground', 'the Background panel shows its backgrounds'],
    ['PRE-06-08', 'gtWidgets', 'the Widgets panel shows its widgets'],
  ];
  for (const [id, tool, what] of PANELS) {
    test(`${id}: ${what} when it is first opened with no network`, { tag: ['@interruption'] }, async ({ page }) => {
      const app = new WithoutLoginPage(page);
      await app.toolbar.openToolPanel(tool);
      await expect(app.panelOptions[tool].filter({ visible: true }).first(), what).toBeVisible({ timeout: 5000 });
    });
  }
});
