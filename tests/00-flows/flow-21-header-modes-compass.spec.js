// FLOW-21 — Header, modes and the Compass
// Source: CEPV2_Stories/00_EndToEndFlows.md
// Data: the default class (Class 9A Science 4.1) and, for the Compass, 'compassBaseline' (Class 11A Mathematics 1.1,
// where it shows Explore It and Analyse It). Read only, except the toolbar side, theme and keyboard settings, which are
// put back at the end of each test.

const { test, expect } = require('../../fixtures');
const { BASE_URL } = require('../../config/env');
const { HeaderPage } = require('../../pages/header.page');
const { whereAmI, boardStrokes, reloadSignedIn } = require('./flow-helpers');

const look = (page) =>
  page.evaluate(
    () =>
      `${document.documentElement.className}|${document.body.className}|${getComputedStyle(document.body).backgroundColor}`
  );
const toggleTheme = async (user) => {
  await user.userMenu.openProfileMenu();
  await user.userMenu.darkModeToggle.click({ force: true });
  await user.page.waitForTimeout(1000);
  await user.page.keyboard.press('Escape');
};
const setKeyboard = async (user, on) => {
  await user.userMenu.openProfileMenu();
  if ((await user.userMenu.virtualKeyboardToggle.evaluate((el) => el.checked)) !== on)
    await user.userMenu.virtualKeyboardToggle.click({ force: true });
  await user.page.keyboard.press('Escape');
  await user.page.mouse.click(200, 400);
  await user.page.waitForTimeout(500);
};
const keyboardShown = (page) =>
  page.evaluate(() => {
    const k = document.querySelector('.simple-keyboard');
    if (!k) return false;
    const r = k.getBoundingClientRect();
    return r.height > 0 && r.top < window.innerHeight - 20 && r.bottom > 0;
  });

test.describe('FLOW-21 Header, modes and the Compass', () => {
  test.describe.configure({ timeout: 240000 });

  test(
    'FLOW-21-01: the header shows logo, build version, date and time',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await expect(user.header.logoImage, 'the logo').toBeVisible();
      expect(
        await user.header.logoImage.evaluate((img) => img.naturalWidth || 0),
        'the logo image loaded'
      ).toBeGreaterThan(0);
      await expect(user.header.versionText, 'the build version').toHaveText(/\d+\.\d+\.\d+/);
      const t = await user.header.readDateTime();
      expect(t.shownDate, 'today’s date').toBe(t.nowDate);
      expect(t.shownMinutes, 'a time').not.toBeNull();
      expect(HeaderPage.minuteGap(t.shownMinutes, t.nowMinutes), 'the current time').toBeLessThanOrEqual(1);
    }
  );

  test(
    'FLOW-21-02: switching to Plan Mode and back keeps the class, topic and board',
    { tag: ['@smoke', '@functional'] },
    async ({ user, page }) => {
      await user.toolbar.waitForBoardToSettle();
      const before = await whereAmI(user);
      const board = (await boardStrokes(user)).sort();
      const toPlan = await user.compass.switchToPlanningMode();
      expect(toPlan.switched, 'set-up: in Plan Mode').toBe(true);
      await expect(user.plan.classSubjectHeading, 'Plan Mode opens on the same class').toContainText(
        before.cls.match(/Class\s*\d+/i)?.[0] || 'Class',
        { timeout: 20000 }
      );
      const toTeach = await user.compass.switchToTeachingMode();
      expect(toTeach.switched, 'back in Teach Mode').toBe(true);
      expect(toTeach.viaFallbackNavigation, 'through the mode switch itself, not a reload').toBeFalsy();
      await expect(user.login.avatar).toBeVisible({ timeout: 20000 });
      await expect(user.nav.currentClassBtn, 'the same class').toHaveText(before.cls, { timeout: 30000 });
      expect((await whereAmI(user)).topic, 'the same topic').toBe(before.topic);
      await user.toolbar.waitForBoardToSettle();
      expect((await boardStrokes(user)).sort(), 'the same board').toEqual(board);
      expect(page.url()).toContain(new URL(BASE_URL).pathname);
    }
  );

  test(
    'FLOW-21-03: moving the toolbar to the other side keeps it there after a reload',
    { tag: ['@functional'] },
    async ({ user }) => {
      const start = await user.header.dockedSide();
      expect(['left', 'right'], 'set-up: the toolbar is on one side').toContain(start);
      await user.header.toggleDock();
      const moved = await user.header.dockedSide();
      try {
        expect(moved, 'the toolbar moved to the other side').not.toBe(start);
        await reloadSignedIn(user);
        expect(await user.header.dockedSide(), 'still there after a reload').toBe(moved);
      } finally {
        if ((await user.header.dockedSide()) !== start) await user.header.toggleDock();
      }
    }
  );

  test.describe('the Compass', () => {
    test.use({ classMap: 'compassBaseline' });

    test(
      'FLOW-21-04: Compass opens Explore It and Analyse It and closes back to the board',
      { tag: ['@functional'] },
      async ({ user, page }) => {
        await user.toolbar.waitForBoardToSettle();
        const board = (await boardStrokes(user)).sort();
        const { opened } = await user.compass.openTrigger();
        expect(opened, 'the Compass opens').toBe(true);
        await expect(user.compass.exploreItWidgets.first(), 'Explore It').toBeVisible({ timeout: 10000 });
        await expect(user.compass.analyseItItem.or(user.compass.noHomeworkMessage).first(), 'Analyse It').toBeVisible();
        await user.compass.triggerBtn.click({ force: true });
        await expect(user.compass.menu, 'the Compass closes').toBeHidden({ timeout: 5000 });
        await expect(user.toolbar.wbSvg, 'back to the board').toBeVisible();
        expect((await boardStrokes(user)).sort(), 'the board as it was').toEqual(board);
        expect(page.url()).toMatch(/\/teach\//);
      }
    );
  });

  test(
    'FLOW-21-05: the theme and Virtual Keyboard settings work across screens',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const before = await look(page);
      await toggleTheme(user);
      try {
        const themed = await look(page);
        expect(themed, 'the theme changes on the board').not.toBe(before);
        await user.nav.goToChapterTopic(2, 0);
        expect(await look(page), 'and stays on another topic').toBe(themed);
        await setKeyboard(user, true);
        await user.toolbar.selectTool('gtInserttext');
        await page.mouse.click(700, 420);
        await expect.poll(() => keyboardShown(page), { message: 'the keyboard opens for a board text box' }).toBe(true);
        await page.keyboard.press('Escape');
        await user.toolbar.selectTool('gtSelect');
        await user.addResource.openAction('create');
        await user.addResource.titleInput.click({ force: true });
        await expect.poll(() => keyboardShown(page), { message: 'and for the Add Resource title' }).toBe(true);
        expect(await look(page), 'the theme holds on the Add Resource screen').toBe(themed);
      } finally {
        await user.addResource.cancelBtn.click({ force: true, timeout: 3000 }).catch(() => {});
        await toggleTheme(user).catch(() => {});
        await user.nav.applyClassMap('default').catch(() => {});
      }
    }
  );

  test(
    'FLOW-21-06: Sign Out from the header asks first and signs out on confirm',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await user.userMenu.openProfileMenu();
      await user.userMenu.signOutBtn.click({ force: true });
      const ask = page
        .locator('mat-dialog-container, [role="dialog"]')
        .filter({ hasText: /sign out|log ?out/i })
        .or(user.login.floatingSignOutCountdown)
        .first();
      await expect(ask, 'it asks first').toBeVisible({ timeout: 5000 });
      await expect(user.login.avatar, 'still signed in while it asks').toBeVisible();
      const confirm = page
        .locator('mat-dialog-container, [role="dialog"]')
        .getByRole('button', { name: /sign out|log ?out|yes|confirm/i })
        .first();
      if (await confirm.isVisible().catch(() => false)) await confirm.click();
      await expect(user.login.avatar, 'signed out on confirm').toBeHidden({ timeout: 20000 });
      await expect(user.login.guestModeText, 'back in Guest Mode').toBeVisible();
    }
  );
});
