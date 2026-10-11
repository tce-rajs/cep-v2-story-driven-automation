// FLOW-01 — From Guest Mode to the teacher's own board
// Source: CEPV2_Stories/00_EndToEndFlows.md
// The panel starts in Guest Mode; the teacher writes, signs in, finds their own board, and signs out again. Guest
// writing is a unique text marker on the Guest Mode board (never saved anywhere); the teacher's board is only read,
// except FLOW-01-07, which writes one stroke on fresh space below the teacher's writing (never erased).

const { test, expect } = require('../../fixtures');
const { GUEST_TOOL_IDS } = require('../../pages/without-login.page');
const { whereAmI, boardStrokes, boardTexts, onBoard, reloadSignedIn, waitForAutosave } = require('./flow-helpers');

const sorted = (a) => [...a].sort();

test.describe('FLOW-01 From Guest Mode to the teacher’s own board', () => {
  test.describe.configure({ timeout: 180000 });

  test(
    'FLOW-01-01: the panel opens in Guest Mode with a usable board, toolbar and header',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      await app.guest.open();
      await expect(app.login.guestModeText, 'Guest Mode').toBeVisible({ timeout: 15000 });
      await expect(app.login.avatar, 'nobody signed in').toBeHidden();
      await expect(app.toolbar.wbSvg, 'the board').toBeVisible();
      for (const id of GUEST_TOOL_IDS) await expect(app.toolbar.tool(id), `toolbar: ${id}`).toBeVisible();
      await expect(app.header.logoImage, 'header logo').toBeVisible();
      await expect(app.header.versionText, 'header build').toHaveText(/\d+\.\d+\.\d+/);
      await expect(app.header.calendar, 'header date and time').toHaveText(/\d{1,2}\s*:\s*\d{2}/);
      // "Usable": a stroke lands on it.
      const before = await app.toolbar.pathCount();
      await app.guest.draw();
      expect(await app.toolbar.pathCount(), 'a stroke can be drawn').toBe(before + 1);
    }
  );

  test(
    'FLOW-01-02: writing, a shape and a widget work in Guest Mode',
    { tag: ['@functional'] },
    async ({ app, page }) => {
      await app.guest.open();
      const marker = `GUEST-${Date.now().toString(36)}`;
      await app.whiteboard.insertTextAndType(400, 260, marker);
      await page.keyboard.press('Escape');
      expect(await onBoard(app, marker), 'the typed text is on the board').toBe(true);

      const objects = await app.toolbar.objectCount();
      await app.guest.addRectangleAt(700, 420);
      expect(await app.toolbar.objectCount(), 'the shape is on the board').toBeGreaterThan(objects);

      await app.guest.openWidgets();
      await app.toolbar.widgetTool('Clock').click({ force: true });
      await expect(app.guest.clockWidget, 'the Clock widget opens').toBeVisible({ timeout: 10000 });
      await app.guest.clockCloseBtn.click({ force: true });
      await expect(app.guest.clockWidget, 'and closes').toHaveCount(0);
    }
  );

  test(
    'FLOW-01-03: Sign In opens from Guest Mode and signs the teacher in',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      await app.guest.open();
      await app.login.openSignIn();
      await expect.poll(() => app.login.isSignInOpen(), { message: 'the Sign In panel opens' }).toBe(true);
      await app.login.enterPin(process.env.VALID_PIN);
      await expect(app.login.avatar, 'signed in').toBeVisible({ timeout: 20000 });
      await expect(app.login.guestModeText, 'no longer in Guest Mode').toBeHidden();
    }
  );

  test(
    "FLOW-01-04: after sign-in the teacher's last class and topic open with their saved board",
    { tag: ['@functional'] },
    async ({ user, page }) => {
      // `user` has signed in and opened the default class; that is now the last class and topic.
      await user.toolbar.waitForBoardToSettle();
      const left = await whereAmI(user);
      const board = await boardStrokes(user);
      await user.userMenu.signOut();
      await page.waitForTimeout(2000);

      await user.signIn();
      await expect(user.nav.currentClassBtn, 'the last class opens').toHaveText(left.cls, { timeout: 30000 });
      expect((await whereAmI(user)).topic, 'the last topic opens').toBe(left.topic);
      await user.toolbar.waitForBoardToSettle();
      expect(sorted(await boardStrokes(user)), 'with its saved board').toEqual(sorted(board));
    }
  );

  test(
    "FLOW-01-05: guest writing does not appear on the teacher's saved board",
    { tag: ['@negative'] },
    async ({ app, page }) => {
      await app.guest.open();
      const marker = `GUEST-${Date.now().toString(36)}`;
      await app.whiteboard.insertTextAndType(400, 260, marker);
      await page.keyboard.press('Escape');
      expect(await onBoard(app, marker), 'set-up: the marker is on the guest board').toBe(true);

      await app.signIn();
      await app.toolbar.waitForBoardToSettle();
      expect(await onBoard(app, marker), 'not on the teacher’s board after sign-in').toBe(false);
      await reloadSignedIn(app);
      expect(await onBoard(app, marker), 'and not saved to it (after a reload)').toBe(false);
    }
  );

  test(
    'FLOW-01-06: signing out returns to Guest Mode with an empty guest board',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await user.userMenu.signOut();
      await page.waitForTimeout(2000);
      await expect(user.login.guestModeText, 'back in Guest Mode').toBeVisible({ timeout: 15000 });
      await expect(user.magnet.tool, 'no signed-in tools').toHaveCount(0);
      expect(await user.toolbar.objectCount(), 'the guest board is empty').toBe(0);
    }
  );

  test(
    "FLOW-01-07: the teacher's board is not visible in Guest Mode after sign out",
    { tag: ['@negative'] },
    async ({ user, page }) => {
      await user.content.startOnFreshSpace();
      await user.toolbar.penStroke({ x: 560, y: 420 }, { x: 860, y: 500 });
      await waitForAutosave(user);
      const teacherStrokes = await boardStrokes(user);
      const teacherTexts = await boardTexts(user);
      await user.userMenu.signOut();
      await page.waitForTimeout(2500);

      const guestStrokes = await boardStrokes(user);
      expect(
        guestStrokes.filter((d) => teacherStrokes.includes(d)),
        'none of the teacher’s strokes in Guest Mode'
      ).toEqual([]);
      const guestTexts = await boardTexts(user);
      expect(
        guestTexts.filter((t) => teacherTexts.includes(t)),
        'none of the teacher’s text in Guest Mode'
      ).toEqual([]);
    }
  );
});
