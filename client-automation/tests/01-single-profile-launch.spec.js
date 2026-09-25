// CLIENT-01 -- Cold launch with a single saved profile
// CONFIRMED LIVE (2026-09-23): with exactly one saved profile, the client connects straight to that profile's
// server on launch -- no profile-picker step. This is the assumption ../../fixtures/electron-app.js (the main
// suite's own launch fixture) is built on. CLIENT-04 covers what changes once a second profile exists.

const {
  test,
  expect,
  launchShell,
  teachWindowOf,
  isOnProfileChooser,
  backupSettingsRaw,
  restoreSettingsRaw,
  forceSingleProfile,
} = require('../fixtures/shell');

test.describe('CLIENT-01 Cold launch (single profile)', () => {
  let backup;

  test.beforeEach(() => {
    backup = backupSettingsRaw();
    forceSingleProfile({ title: 'QA-V2', url: 'https://ce-qa-school.devstudi.com/teach/' });
  });

  test.afterEach(() => {
    restoreSettingsRaw(backup);
  });

  test('a single saved profile connects directly to its server, no profile picker', async () => {
    test.setTimeout(60000);
    const { app, shell } = await launchShell();
    try {
      const onChooser = await isOnProfileChooser(shell);
      expect(onChooser, 'no profile-picker screen with only one profile saved').toBe(false);

      const teachWindow = teachWindowOf(app);
      expect(teachWindow, 'the teach webview opened directly').not.toBeUndefined();
      expect(teachWindow.url()).toContain('ce-qa-school.devstudi.com');
    } finally {
      await app.close();
    }
  });
});
