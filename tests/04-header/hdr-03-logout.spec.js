// HDR-03 — Logout
// Source: CEPV2_Stories/04_Header.md
// "Logout" is the Sign Out entry of the avatar menu (there is no separate control in the header bar).
// HDR-03-01 also names Plan Mode; the Plan Mode half is manual-only (PROCESS.md).

const { test, expect } = require('../../fixtures');

test.describe('HDR-03 Logout', () => {
  test('HDR-03-01: clicking Logout signs out correctly', { tag: ['@smoke', '@functional'] }, async ({ user }) => {
    await user.userMenu.signOut();

    await expect(user.login.avatar).toBeHidden();
    await expect(user.login.guestModeText).toBeVisible();
    await expect(user.page).toHaveURL(/\/teach\/whiteboard/);
    // Tools that need a session are gone again.
    await expect(user.magnet.tool).toHaveCount(0);
  });

  test(
    'HDR-03-02: double-clicking Logout causes no error and no double sign-out or navigation',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await user.userMenu.openProfileMenu();
      await user.userMenu.signOutBtn.dblclick({ force: true });
      await expect(user.login.avatar).toBeHidden({ timeout: 10000 });
      await page.waitForTimeout(1500);

      await expect(user.login.guestModeText).toBeVisible();
      await expect(page).toHaveURL(/\/teach\/whiteboard/);
      expect(errors, 'no uncaught page errors').toEqual([]);
    }
  );

  test('HDR-03-08: the quick Sign Out button is not shown in Guest Mode', { tag: ['@negative'] }, async ({ app }) => {
    await app.guest.open();
    await expect(app.login.floatingSignOut.filter({ visible: true }), 'no quick Sign Out button').toHaveCount(0);
  });

  // The quick Sign Out button (bottom left): pressing it shows a countdown button with the seconds left; pressing the
  // countdown cancels; at zero the teacher is signed out. One test per result (HDR-03-03 .. HDR-03-07).
  test(
    'HDR-03-03: the quick Sign Out button starts a countdown before signing out',
    { tag: ['@functional'] },
    async ({ user }) => {
      await user.login.floatingSignOut.click({ force: true });
      await expect(user.login.floatingSignOutCountdown, 'a countdown is shown').toHaveText(/^\s*\d+\s*$/, {
        timeout: 5000,
      });
      const first = Number((await user.login.floatingSignOutCountdown.innerText()).trim());
      await expect
        .poll(async () => Number((await user.login.floatingSignOutCountdown.innerText().catch(() => '0')).trim()), {
          message: 'the countdown counts down',
          timeout: 5000,
        })
        .toBeLessThan(first);
      await expect(user.login.avatar, 'still signed in during the countdown').toBeVisible();
      await user.login.floatingSignOutCountdown.click({ force: true }); // cancel, to leave the session as found
    }
  );

  test(
    'HDR-03-04: the teacher is signed out when the quick Sign Out countdown reaches zero',
    { tag: ['@functional'] },
    async ({ user }) => {
      await user.login.floatingSignOut.click({ force: true });
      await expect(user.login.floatingSignOutCountdown, 'set-up: the countdown started').toBeVisible({ timeout: 5000 });
      await expect(user.login.avatar, 'signed out at zero').toBeHidden({ timeout: 20000 });
      await expect(user.login.guestModeText, 'back in Guest Mode').toBeVisible();
    }
  );

  test(
    'HDR-03-05: the quick Sign Out countdown can be cancelled, and the teacher stays signed in with the board unchanged',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const before = await user.content.pathGeometry();
      await user.login.floatingSignOut.click({ force: true });
      await expect(user.login.floatingSignOutCountdown, 'set-up: the countdown started').toBeVisible({ timeout: 5000 });
      await user.login.floatingSignOutCountdown.click({ force: true });
      await page.waitForTimeout(15000); // longer than the countdown
      await expect(user.login.avatar, 'still signed in').toBeVisible();
      expect(await user.content.pathGeometry(), 'board unchanged').toEqual(before);
    }
  );

  test(
    'HDR-03-06: writing done just before a quick Sign Out is on the board after signing back in',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      test.setTimeout(180000);
      await user.content.startOnFreshSpace();
      await user.toolbar.penStroke({ x: 620, y: 420 }, { x: 900, y: 500 });
      const stroke = await user.toolbar.paths.last().getAttribute('d');
      await user.login.floatingSignOut.click({ force: true });
      await expect(user.login.avatar, 'set-up: signed out at zero').toBeHidden({ timeout: 20000 });
      await user.signIn();
      await user.nav.applyClassMap('default');
      await user.toolbar.waitForBoardToSettle();
      const strokes = await user.toolbar.allPaths.evaluateAll((ps) => ps.map((p) => p.getAttribute('d')));
      expect(strokes, 'the stroke written just before signing out is on the board').toContain(stroke);
    }
  );

  test(
    'HDR-03-07: clicking the quick Sign Out button twice quickly does not start two countdowns',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      await user.login.floatingSignOut.dblclick({ force: true });
      await page.waitForTimeout(1500);
      // A double tap may start the countdown and cancel it again; it must never start two.
      const running = await user.login.floatingSignOutCountdown.filter({ visible: true }).count();
      expect(running, 'at most one countdown').toBeLessThanOrEqual(1);
      if (running) await user.login.floatingSignOutCountdown.click({ force: true });
      await page.waitForTimeout(12000);
      await expect(user.login.avatar, 'no second countdown signs the teacher out').toBeVisible();
    }
  );
});
