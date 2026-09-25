// LOG-01-14 — closing and reopening the client signs the previous user out
// Source: CEPV2_Stories/03_Login.md
//
// Needs raw control over closing and relaunching a whole separate app instance (not just reusing the
// worker's shared window), so this uses Playwright's own `test`/`expect` directly instead of this suite's
// fixtures -- desktop-client-only, no RUN_IN_BROWSER equivalent.

const { test, expect } = require('@playwright/test');
const { launchWithRetry } = require('../../fixtures/electron-app');
const { App } = require('../../pages/app');

test(
  'LOG-01-14: closing and reopening the client signs the previous user out (regression)',
  { tag: ['@regression'] },
  async () => {
    test.skip(!!process.env.RUN_IN_BROWSER, 'relaunching the desktop client has no browser-mode equivalent');
    test.setTimeout(120000);

    // Zoho TCN-I16282: sign in, close the client, reopen it -- the previous session should NOT be restored;
    // the client should come back up in Guest Mode, requiring a fresh sign-in.
    const first = await launchWithRetry();
    try {
      const app1 = new App(first.teachWindow);
      await app1.signIn();
      await expect(app1.login.avatar).toBeVisible({ timeout: 15000 });
    } finally {
      await first.app.close().catch(() => {});
    }

    const second = await launchWithRetry();
    try {
      const app2 = new App(second.teachWindow);
      await expect(app2.login.avatar, 'the previous session was not restored').toBeHidden({ timeout: 10000 });
      await expect(app2.login.toggleButton, 'a fresh launch requires signing in again').toBeVisible({
        timeout: 10000,
      });
    } finally {
      await second.app.close().catch(() => {});
    }
  }
);
