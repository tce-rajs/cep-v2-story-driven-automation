// CLIENT-08 -- Settings: Add Web URL / Advanced Options / clear-cache
// CONFIRMED LIVE (2026-09-23): beyond Basic Options (CLIENT-02), the Settings screen has two more collapsible
// sections -- "Add Web URL" and "Advanced Options" (Display Mode, CE Version, Player Behaviour, Erase
// Strength, Classroom/Animation/Whiteboard/Gesture toggles, Abbreviation) -- plus a clear-cache icon
// (paint-brush, top right, alongside add-profile/remove-profile) not covered by any other test in this suite.

const {
  test,
  expect,
  launchShell,
  openSettings,
  backupSettingsRaw,
  restoreSettingsRaw,
  forceSingleProfile,
} = require('../fixtures/shell');

test.describe('CLIENT-08 Settings: Add Web URL / Advanced Options / clear-cache', () => {
  let backup;

  test.beforeEach(() => {
    backup = backupSettingsRaw();
    forceSingleProfile({ title: 'QA-V2', url: 'https://ce-qa-school.devstudi.com/teach/' });
  });

  test.afterEach(() => {
    restoreSettingsRaw(backup);
  });

  test('Add Web URL and Advanced Options expand to show real fields, not empty panels', async () => {
    test.setTimeout(60000);
    const { app, shell } = await launchShell();
    try {
      await openSettings(shell);
      await shell.getByText('Add Web URL', { exact: true }).first().click({ force: true });
      await shell.waitForTimeout(500);
      await shell.getByText('Advanced Options', { exact: true }).first().click({ force: true });
      await shell.waitForTimeout(500);

      const bodyText = await shell.evaluate(() => document.body.innerText);
      for (const label of ['Display Mode', 'CE Version', 'Player Behaviour', 'Erase Strength']) {
        expect(bodyText, `Advanced Options shows a real "${label}" field, not an empty panel`).toContain(label);
      }
    } finally {
      await app.close();
    }
  });

  test('the clear-cache icon does not crash the app', async () => {
    test.setTimeout(60000);
    const { app, shell } = await launchShell();
    try {
      await openSettings(shell);
      const errors = [];
      shell.on('pageerror', (err) => errors.push(err.message));

      await shell.locator('.clear-cache').first().click({ force: true, timeout: 10000 });
      await shell.waitForTimeout(2000);

      const stillAlive = await shell.evaluate(() => document.readyState).catch(() => null);
      expect(stillAlive, 'the shell is still responsive after clearing cache').not.toBeNull();
      expect(errors, 'no uncaught page errors').toEqual([]);
    } finally {
      await app.close();
    }
  });
});
