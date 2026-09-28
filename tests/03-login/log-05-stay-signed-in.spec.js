// LOG-05 — Stay signed in
// Source: CEPV2_Stories/03_Login.md
// LOG-05-02 waits in real time (@long). LOG-05-03/04 fake the network failure with page.route (the whole network / only the sign-in request).

const { test, expect } = require('../../fixtures');

const isAuthUrl = (url) => /auth|login|sso|token/i.test(url);

test.describe('LOG-05 Stay signed in', () => {
  test(
    'LOG-05-01: the user is still signed in after the app reloads',
    { tag: ['@smoke', '@functional'] },
    async ({ user, page }) => {
      await page.reload();
      await expect(user.login.avatar).toBeVisible({ timeout: 30000 });
      await expect(user.login.toggleButton, 'no Sign In button').toBeHidden();
    }
  );

  test(
    'LOG-05-02: the inactivity warning shows a countdown, and "Stay Signed In" keeps the session',
    { tag: ['@functional', '@long'] },
    async ({ user, page }) => {
      // CONFIRMED LIVE (2026-09-26): Playwright's fake clock (page.clock) has no effect inside the desktop client, so this
      // waits in real time for the app's own inactivity warning. SESSION_WARNING_MINUTES caps the wait (default 20).
      const maxMinutes = Number(process.env.SESSION_WARNING_MINUTES || 20);
      test.setTimeout((maxMinutes + 3) * 60 * 1000);
      const stay = page.getByRole('button', { name: /stay signed in/i });
      await expect(stay, 'inactivity warning with "Stay Signed In"').toBeVisible({ timeout: maxMinutes * 60 * 1000 });
      await expect(
        page
          .getByText(/\d+\s*(s|sec|seconds)\b|\d{1,2}:\d{2}/i)
          .filter({ visible: true })
          .first(),
        'a countdown is shown'
      ).toBeVisible();

      await stay.click();
      await page.waitForTimeout(5000);
      await expect(stay).toBeHidden();
      await expect(user.login.avatar, 'still signed in after "Stay Signed In"').toBeVisible();
      await expect(user.login.toggleButton, 'not bounced to Sign In').toBeHidden();
      // Still usable afterwards, not a signed-in-looking shell.
      await user.nav.openClassPopup();
      await expect(user.nav.recentClassesTab).toBeVisible({ timeout: 10000 });
    }
  );

  test(
    'LOG-05-03: signing in with no network shows a clear error, not a hang',
    { tag: ['@negative'] },
    async ({ app, page }) => {
      await app.guest.open();
      await app.login.openSignIn();
      await expect(app.login.pinDigitBox(0)).toBeVisible({ timeout: 10000 });
      await page.route('**/*', (route) => route.abort('internetdisconnected'));
      try {
        await app.login.enterPin(process.env.VALID_PIN);
        await expect(
          app.login.pinErrorMessage
            .or(page.getByText(/network|connection|offline|unable|try again/i).filter({ visible: true }))
            .first(),
          'a clear error'
        ).toBeVisible({ timeout: 20000 });
        await expect(app.login.avatar).toBeHidden();
      } finally {
        await page.unroute('**/*');
      }
    }
  );

  test(
    'LOG-05-04: a server error during sign-in shows a clear message and the user can try again',
    { tag: ['@negative'] },
    async ({ app, page }) => {
      await app.guest.open();
      await app.login.openSignIn();
      await expect(app.login.pinDigitBox(0)).toBeVisible({ timeout: 10000 });
      const failSignIn = (route) =>
        route.request().method() === 'POST' && isAuthUrl(route.request().url())
          ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Internal Server Error"}' })
          : route.continue();
      await page.route('**/*', failSignIn);
      await app.login.enterPin(process.env.VALID_PIN);
      await expect(
        app.login.pinErrorMessage
          .or(page.getByText(/error|went wrong|unable|try again/i).filter({ visible: true }))
          .first(),
        'a clear message'
      ).toBeVisible({ timeout: 20000 });
      await page.unroute('**/*', failSignIn);

      // Trying again works once the server is back.
      await app.signIn(process.env.VALID_PIN);
      await expect(app.login.avatar).toBeVisible();
    }
  );
});
