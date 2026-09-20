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
});
