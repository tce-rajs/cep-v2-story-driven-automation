// CLIENT-03 -- Switching server through the Settings UI
// CONFIRMED LIVE (2026-09-23): editing the Server Path field and clicking Save & Run (a) reconnects the
// currently-open teach webview to the new URL, and (b) persists it to tce_settings.json's profiles[0].path --
// the EXACT same field scripts/set-server.js (the project's own automation for this) edits directly. Confirmed
// both mechanisms write the identical field, so they're equivalent, not two different systems.

const {
  test,
  expect,
  launchShell,
  teachWindowOf,
  openSettings,
  serverPathField,
  saveRunBtn,
  backupSettingsRaw,
  restoreSettingsRaw,
  forceSingleProfile,
  readSettings,
} = require('../fixtures/shell');

const OTHER_SERVER = 'http://172.18.2.85/teach/';

test.describe('CLIENT-03 Server switch via Settings UI', () => {
  let backup;

  test.beforeEach(() => {
    backup = backupSettingsRaw();
    forceSingleProfile({ title: 'QA-V2', url: 'http://172.18.2.85/teach/' });
  });

  test.afterEach(() => {
    restoreSettingsRaw(backup);
  });

  test('editing Server Path and Save & Run reconnects to the new server and persists it', async () => {
    test.setTimeout(60000);
    const { app, shell } = await launchShell();
    try {
      await openSettings(shell);
      const field = serverPathField(shell);
      await field.click({ force: true });
      await field.fill('');
      await field.fill(OTHER_SERVER);
      await saveRunBtn(shell).click({ force: true, timeout: 10000 });
      await shell.waitForTimeout(5000);

      const teachWindow = teachWindowOf(app);
      expect(teachWindow, 'the teach webview is still there after switching').not.toBeUndefined();
      expect(teachWindow.url(), 'it reconnected to the NEW server').toContain('172.18.2.85');

      const saved = readSettings();
      expect(saved.profiles[0].path, 'the switch was written back to tce_settings.json').toBe(OTHER_SERVER);
    } finally {
      await app.close();
    }
  });
});
