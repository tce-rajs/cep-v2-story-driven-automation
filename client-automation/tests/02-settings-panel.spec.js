// CLIENT-02 -- Settings screen
// CONFIRMED LIVE (2026-09-23): reached via the bottom-right admin toggle (#adminToggle, a checkbox-hack menu
// with no visible label until clicked) -> Settings. Shows Basic Options (ClassEdge Server Path, Profile Name,
// Online, school name), Add Web URL, Advanced Options, and Save & Run.

const {
  test,
  expect,
  launchShell,
  openSettings,
  serverPathField,
  profileNameField,
  saveRunBtn,
  backupSettingsRaw,
  restoreSettingsRaw,
  forceSingleProfile,
  readSettings,
} = require('../fixtures/shell');

test.describe('CLIENT-02 Settings screen', () => {
  let backup;

  test.beforeEach(() => {
    backup = backupSettingsRaw();
    forceSingleProfile({ title: 'QA-V2', url: 'http://172.18.2.85/teach/' });
  });

  test.afterEach(() => {
    restoreSettingsRaw(backup);
  });

  test("opens from the admin menu and shows the current profile's real values", async ({}, testInfo) => {
    testInfo.setTimeout(60000);
    const { app, shell } = await launchShell();
    try {
      await openSettings(shell);

      const currentUrl = readSettings().profiles[0].path;
      await expect(serverPathField(shell), "Server Path field shows the current profile's real URL").toHaveValue(
        currentUrl
      );
      await expect(profileNameField(shell), "Profile Name field shows the current profile's real name").toHaveValue(
        'QA-V2'
      );
      await expect(saveRunBtn(shell), 'a Save & Run control is offered').toBeVisible();
    } finally {
      await app.close();
    }
  });
});
