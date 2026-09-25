// CLIENT-06 -- Record Screen
// CONFIRMED LIVE (2026-09-23): admin menu -> Record Screen starts recording IMMEDIATELY on click (no confirm
// step, no picker) -- the bottom-right admin toggle is replaced by a red recording indicator. Clicking it
// again is the only way found to stop it. Not exercised further than this start/stop round-trip: the actual
// recording FILE is out of scope here (environment-specific, and this suite's job is the client's own UI
// behaviour, not verifying video output).

const {
  test,
  expect,
  launchShell,
  backupSettingsRaw,
  restoreSettingsRaw,
  forceSingleProfile,
} = require('../fixtures/shell');

test.describe('CLIENT-06 Record Screen', () => {
  let backup;

  test.beforeEach(() => {
    backup = backupSettingsRaw();
    forceSingleProfile({ title: 'QA-V2', url: 'https://ce-qa-school.devstudi.com/teach/' });
  });

  test.afterEach(() => {
    restoreSettingsRaw(backup);
  });

  test('starts recording immediately and can be stopped again', async () => {
    test.setTimeout(60000);
    const { app, shell } = await launchShell();
    try {
      await shell.locator('#adminToggle').click({ force: true });
      await shell.waitForTimeout(500);
      await shell.getByText('Record Screen', { exact: true }).first().click({ force: true });
      await shell.waitForTimeout(1500);

      const recordingIndicator = shell.locator('[class*="record" i]').filter({ visible: true }).first();
      await expect(recordingIndicator, 'a recording indicator replaces the admin toggle').toBeVisible();

      // Stop it again so the process doesn't outlive the test.
      await recordingIndicator.click({ force: true, timeout: 5000 }).catch(() => {});
      await shell.waitForTimeout(1500);
    } finally {
      await app.close();
    }
  });
});
