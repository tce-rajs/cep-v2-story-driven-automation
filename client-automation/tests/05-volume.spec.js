// CLIENT-05 -- Volume control
// CONFIRMED LIVE (2026-09-23): admin menu -> Volume opens a small slider widget (mute/loud icons either end,
// a close button) as an overlay on the shell -- no navigation, no effect on the teach webview.

const {
  test,
  expect,
  launchShell,
  backupSettingsRaw,
  restoreSettingsRaw,
  forceSingleProfile,
} = require('../fixtures/shell');

test.describe('CLIENT-05 Volume control', () => {
  let backup;

  test.beforeEach(() => {
    backup = backupSettingsRaw();
    forceSingleProfile({ title: 'QA-V2', url: 'http://172.18.2.85/teach/' });
  });

  test.afterEach(() => {
    restoreSettingsRaw(backup);
  });

  test('opens a slider widget and closes again', async () => {
    test.setTimeout(60000);
    const { app, shell } = await launchShell();
    try {
      await shell.locator('#adminToggle').click({ force: true });
      await shell.waitForTimeout(500);
      await shell.getByText('Volume', { exact: true }).first().click({ force: true });
      await shell.waitForTimeout(1000);

      const slider = shell.locator('input[type="range"][name="volume"]');
      await expect(slider, 'the volume slider is showing').toBeVisible();

      const closeBtn = shell.locator('.ion-close-round, [class*="close" i]').filter({ visible: true }).first();
      await closeBtn.click({ force: true });
      await shell.waitForTimeout(500);
      await expect(slider, 'closes again').toBeHidden();
    } finally {
      await app.close();
    }
  });
});
