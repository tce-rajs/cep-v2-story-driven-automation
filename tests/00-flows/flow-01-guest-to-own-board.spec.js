// FLOW-01 — From Guest Mode to the teacher's own board
// Source: CEPV2_Stories/00_EndToEndFlows.md
// The teacher follows the complete Guest Mode -> sign-in -> sign-out journey in one client session.

const { test, expect } = require('../../fixtures');
const { App } = require('../../pages/app');
const { GUEST_TOOL_IDS } = require('../../pages/without-login.page');
const { whereAmI, boardStrokes, boardTexts, onBoard, reloadSignedIn, waitForAutosave } = require('./flow-helpers');

const sorted = (values) => [...values].sort();

test.describe('FLOW-01 From Guest Mode to the teacher’s own board', () => {
  test.describe.configure({ timeout: 180000 });

  test(
    'FLOW-01: Guest Mode to the teacher’s own board',
    { tag: ['@smoke', '@functional', '@negative'] },
    async ({ page }) => {
      const app = new App(page);

      await test.step('FLOW-01-01: Guest Mode opens with a usable board, toolbar and header', async () => {
        await app.guest.open();
        await expect(app.login.guestModeText, 'Guest Mode').toBeVisible({ timeout: 15000 });
        await expect(app.login.avatar, 'nobody signed in').toBeHidden();
        await expect(app.toolbar.wbSvg, 'the board').toBeVisible();
        for (const id of GUEST_TOOL_IDS) await expect(app.toolbar.tool(id), `toolbar: ${id}`).toBeVisible();
        await expect(app.header.logoImage, 'header logo').toBeVisible();
        await expect(app.header.versionText, 'header build').toHaveText(/\d+\.\d+\.\d+/);
        await expect(app.header.calendar, 'header date and time').toHaveText(/\d{1,2}\s*:\s*\d{2}/);
        const before = await app.toolbar.pathCount();
        await app.guest.draw();
        expect(await app.toolbar.pathCount(), 'a stroke can be drawn').toBe(before + 1);
      });

      const guestMarker = `GUEST-${Date.now().toString(36)}`;

      await test.step('FLOW-01-02: writing, a shape and a widget work in Guest Mode', async () => {
        await app.whiteboard.insertTextAndType(400, 260, guestMarker);
        await page.keyboard.press('Escape');
        expect(await onBoard(app, guestMarker), 'the typed text is on the board').toBe(true);

        const objects = await app.toolbar.objectCount();
        await app.guest.addRectangleAt(700, 420);
        expect(await app.toolbar.objectCount(), 'the shape is on the board').toBeGreaterThan(objects);

        await app.guest.openWidgets();
        await app.toolbar.widgetTool('Clock').click();
        await expect(app.guest.clockWidget, 'the Clock widget opens').toBeVisible({ timeout: 10000 });
        await app.guest.clockCloseBtn.click();
        await expect(app.guest.clockWidget, 'the Clock widget closes').toHaveCount(0);
      });

      await test.step('FLOW-01-03: Sign In opens from Guest Mode and signs the teacher in', async () => {
        await app.login.openSignIn();
        await expect.poll(() => app.login.isSignInOpen(), { message: 'the Sign In panel opens' }).toBe(true);
        await app.login.enterPin(process.env.VALID_PIN);
        await expect(app.login.avatar, 'signed in').toBeVisible({ timeout: 20000 });
        await expect(app.login.guestModeText, 'no longer in Guest Mode').toBeHidden();
      });

      await test.step('FLOW-01-04: sign-in restores the teacher’s last class, topic and board', async () => {
        await app.toolbar.waitForBoardToSettle();
        const lastLocation = await whereAmI(app);
        const board = await boardStrokes(app);
        await app.userMenu.signOut();
        await expect(app.login.guestModeText, 'signed out to Guest Mode').toBeVisible({ timeout: 15000 });
        await app.signIn(process.env.VALID_PIN);
        await expect(app.nav.currentClassBtn, 'the last class opens').toHaveText(lastLocation.cls, {
          timeout: 30000,
        });
        expect((await whereAmI(app)).topic, 'the last topic opens').toBe(lastLocation.topic);
        await app.toolbar.waitForBoardToSettle();
        expect(sorted(await boardStrokes(app)), 'the saved board is restored').toEqual(sorted(board));
      });

      await test.step('FLOW-01-05: guest writing does not appear on the teacher’s saved board', async () => {
        await app.userMenu.signOut();
        await expect(app.login.guestModeText, 'back in Guest Mode').toBeVisible({ timeout: 15000 });
        const marker = `GUEST-ISOLATION-${Date.now().toString(36)}`;
        await app.whiteboard.insertTextAndType(400, 260, marker);
        await page.keyboard.press('Escape');
        expect(await onBoard(app, marker), 'set-up: the marker is on the guest board').toBe(true);

        await app.signIn(process.env.VALID_PIN);
        await app.toolbar.waitForBoardToSettle();
        expect(await onBoard(app, marker), 'the marker is not on the teacher’s board').toBe(false);
        await reloadSignedIn(app);
        expect(await onBoard(app, marker), 'the marker was not saved to the teacher’s board').toBe(false);
      });

      await test.step('FLOW-01-06: signing out returns to an empty Guest Mode board', async () => {
        await app.userMenu.signOut();
        await expect(app.login.guestModeText, 'back in Guest Mode').toBeVisible({ timeout: 15000 });
        await expect(app.magnet.tool, 'no signed-in tools').toHaveCount(0);
        expect(await app.toolbar.objectCount(), 'the guest board is empty').toBe(0);
      });

      await test.step('FLOW-01-07: the teacher’s board is not visible in Guest Mode', async () => {
        await app.signIn(process.env.VALID_PIN);
        await app.content.startOnFreshSpace();
        await app.toolbar.penStroke({ x: 560, y: 420 }, { x: 860, y: 500 });
        await waitForAutosave(app);
        const teacherStrokes = await boardStrokes(app);
        const teacherTexts = await boardTexts(app);
        await app.userMenu.signOut();
        await expect(app.login.guestModeText, 'back in Guest Mode').toBeVisible({ timeout: 15000 });

        const guestStrokes = await boardStrokes(app);
        expect(
          guestStrokes.filter((stroke) => teacherStrokes.includes(stroke)),
          'none of the teacher’s strokes appear in Guest Mode'
        ).toEqual([]);
        const guestTexts = await boardTexts(app);
        expect(
          guestTexts.filter((text) => teacherTexts.includes(text)),
          'none of the teacher’s text appears in Guest Mode'
        ).toEqual([]);
      });
    }
  );
});
