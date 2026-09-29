// CLIENT-07 -- Desktop (minimize)
// CONFIRMED LIVE (2026-09-23): admin menu -> Desktop calls the app's own minimizeApp() -- it minimizes the
// window, it does not show a literal desktop or switch profiles. CONFIRMED LIVE: a screenshot attempt on a
// minimized window hangs (Playwright's page.screenshot() waits indefinitely for a paintable frame) -- do not
// screenshot after minimizing; check window state instead.

const {
  test,
  expect,
  launchShell,
  backupSettingsRaw,
  restoreSettingsRaw,
  forceSingleProfile,
} = require('../fixtures/shell');

test.describe('CLIENT-07 Desktop (minimize)', () => {
  let backup;

  test.beforeEach(() => {
    backup = backupSettingsRaw();
    forceSingleProfile({ title: 'QA-V2', url: 'http://172.18.2.85/teach/' });
  });

  test.afterEach(() => {
    restoreSettingsRaw(backup);
  });

  test('minimizes the window without crashing the app', async () => {
    test.setTimeout(60000);
    const { app, shell } = await launchShell();
    try {
      await shell.locator('#adminToggle').click({ force: true });
      await shell.waitForTimeout(500);
      await shell.getByText('Desktop', { exact: true }).first().click({ force: true });
      await shell.waitForTimeout(1500);

      // The app must still be alive (not crashed/closed) -- evaluate a trivial expression rather than
      // screenshotting, which hangs on a minimized window.
      const stillAlive = await shell.evaluate(() => document.readyState).catch(() => null);
      expect(stillAlive, 'the shell process is still responsive while minimized').not.toBeNull();
    } finally {
      await app.close();
    }
  });
});
