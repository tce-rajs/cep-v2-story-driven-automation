// PRE-04 — Whiteboard is usable for all core actions
// Source: CEPV2_Stories/01_WithoutLogin.md

const { test, expect } = require('../../fixtures/electron-app');
const { WithoutLoginPage } = require('../../pages/without-login.page');
const { App } = require('../../pages/app');

/** "rgb(187, 134, 252)" -> "#BB86FC" */
const toHex = (rgb) =>
  '#' +
  rgb
    .match(/\d+/g)
    .slice(0, 3)
    .map((n) => Number(n).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

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

  // Opening, using and closing a widget are one test each: PRE-04-05, PRE-04-07, PRE-04-08.
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

  test(
    "PRE-04-09: guest-mode drawing is not added to the teacher's own topic board after signing in",
    { tag: ['@functional', '@negative'] },
    async ({ page }) => {
      test.setTimeout(180000);
      const app = new WithoutLoginPage(page);
      // A stroke only Guest Mode drew: its outline is compared with every stroke on the teacher's board.
      await app.draw({ x: 720, y: 520 }, { x: 980, y: 610 });
      const guestStroke = await app.toolbar.paths.last().getAttribute('d');
      const signedIn = new App(page);
      await signedIn.signIn();
      try {
        await page.waitForTimeout(8000); // the teacher's board finishes loading
        const teacherStrokes = await signedIn.toolbar.allPaths.evaluateAll((ps) => ps.map((p) => p.getAttribute('d')));
        expect(teacherStrokes, "the guest stroke is not on the teacher's board").not.toContain(guestStroke);
      } finally {
        await signedIn.userMenu.signOut().catch(() => {});
      }
    }
  );

  test(
    'PRE-04-10: a pen colour picked in the Pen panel is used for the next stroke',
    { tag: ['@functional'] },
    async ({ page }) => {
      const app = new WithoutLoginPage(page);
      await app.toolbar.openToolPanel('gtPen');
      const purple = app.toolbar.penColorOptions.nth(2);
      const expected = toHex(await purple.evaluate((e) => getComputedStyle(e).backgroundColor));
      await page.keyboard.press('Escape');
      await app.pickPenColour(2);
      await app.draw();
      expect((await app.lastStrokeColour()).toUpperCase(), 'the new stroke uses the picked colour').toBe(expected);
    }
  );

  test(
    'PRE-04-11: Zoom In enlarges the board and Reset returns it to 100%',
    { tag: ['@functional'] },
    async ({ page }) => {
      const app = new WithoutLoginPage(page);
      expect(await app.zoomFactor(), 'set-up: the board starts at 100%').toBeCloseTo(1, 2);
      await app.toolbar.openToolPanel('gtZoom');
      await app.toolbar.zoomInBtn.click({ force: true });
      await expect.poll(() => app.zoomFactor(), { message: 'zoomed in' }).toBeGreaterThan(1.1);
      await app.toolbar.zoomResetBtn.click({ force: true });
      await expect.poll(() => app.zoomFactor(), { message: 'back to 100%' }).toBeCloseTo(1, 2);
      await page.keyboard.press('Escape');
    }
  );

  test(
    'PRE-04-12: drawing done in Guest Mode is not kept after the app reloads (nothing is saved without signing in)',
    { tag: ['@functional'] },
    async ({ page }) => {
      const app = new WithoutLoginPage(page);
      await app.draw();
      expect(await app.toolbar.pathCount(), 'set-up: the stroke is drawn').toBeGreaterThan(0);
      await page.waitForTimeout(12000); // longer than the autosave countdown a signed-in board would use
      await page.reload();
      await app.toolbar.wbSvg.waitFor({ state: 'visible', timeout: 30000 });
      await page.waitForTimeout(3000);
      expect(await app.toolbar.pathCount(), 'the board starts clean').toBe(0);
    }
  );
});
