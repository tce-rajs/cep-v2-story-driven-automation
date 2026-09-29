// CLIENT-04 -- Multiple profiles
// Source of every "CONFIRMED LIVE" claim below: manual exploration through this exact suite's fixture, 2026-09-23.
//
// Findings that matter for automation built on top of this client:
//   1. "Add profile" creates a BLANK profile (no server URL) and switches the shell to it immediately --
//      producing the app's own "No web URLs available" error state until it's configured and saved.
//   2. New profiles get the SAME internal "value" field as the first one (e.g. both "profile2") -- looks like
//      an id that should be unique but isn't. Not proven to cause a visible bug, but worth knowing about if
//      profile-specific behaviour ever looks wrong with 2+ profiles saved.
//   3. THE BIG ONE: with exactly one profile, cold launch connects straight to it (see CLIENT-01). With TWO OR
//      MORE, cold launch instead shows a "SELECT PROFILE" chooser screen and waits for a manual pick. This is a
//      real behavioural fork, not a cosmetic difference -- ../../fixtures/electron-app.js (the main suite's
//      launch fixture) has no code path for this chooser screen, so if this machine ever ends up with 2+ saved
//      profiles, every test in the main suite would hang/fail at launch. Keep this machine on exactly one
//      saved profile for that reason.
//   4. "Remove profile" only updates the in-memory UI state -- it is NOT written to tce_settings.json until
//      Save & Run is clicked afterward. Removing without saving leaves the file untouched.
//   5. GOTCHA that cost real debugging time: the chooser's "SELECT PROFILE" heading renders uppercase via CSS
//      text-transform, but its real DOM text is not that exact string -- an exact, case-sensitive text match
//      against the rendered appearance silently never matches, which first looked like the chooser screen
//      wasn't appearing at all. It was appearing every time; only the locator was wrong. Fixed once in
//      fixtures/shell.js's isOnProfileChooser() (case-insensitive regex) -- every check here goes through that.

const {
  test,
  expect,
  launchShell,
  teachWindowOf,
  openSettings,
  profileTab,
  isOnProfileChooser,
  serverPathField,
  profileNameField,
  saveRunBtn,
  addProfileBtn,
  removeProfileBtn,
  backupSettingsRaw,
  restoreSettingsRaw,
  forceSingleProfile,
  readSettings,
} = require('../fixtures/shell');

const SECOND_SERVER = 'http://172.18.2.85/teach/';
const SECOND_NAME = 'New-Server-Test';

test.describe('CLIENT-04 Multiple profiles', () => {
  let backup;

  test.beforeEach(() => {
    backup = backupSettingsRaw();
    forceSingleProfile({ title: 'QA-V2', url: 'http://172.18.2.85/teach/' });
  });

  test.afterEach(() => {
    // However a test left the profiles, always restore the exact pre-suite state -- this file is external to
    // the repo and shared with every other test run on this machine.
    restoreSettingsRaw(backup);
  });

  test('creating a new profile without configuring it shows "No web URLs available"', async () => {
    test.setTimeout(60000);
    const { app, shell } = await launchShell();
    try {
      await openSettings(shell);
      await addProfileBtn(shell).click({ force: true });
      await shell.waitForTimeout(1500);

      const bodyText = await shell.evaluate(() => document.body.innerText);
      expect(bodyText, 'the app itself reports it has no URL to connect to').toContain('No web URLs available');
    } finally {
      await app.close();
    }
  });

  test('configuring a new profile and Save & Run connects to it', async () => {
    test.setTimeout(60000);
    const { app, shell } = await launchShell();
    try {
      await openSettings(shell);
      await addProfileBtn(shell).click({ force: true });
      await shell.waitForTimeout(1000);

      await serverPathField(shell).fill(SECOND_SERVER);
      await profileNameField(shell).fill(SECOND_NAME);
      await saveRunBtn(shell).click({ force: true, timeout: 10000 });
      await shell.waitForTimeout(5000);

      const teachWindow = teachWindowOf(app);
      expect(teachWindow, 'the newly-configured profile connected').not.toBeUndefined();
      expect(teachWindow.url()).toContain('172.18.2.85');

      const saved = readSettings();
      expect(saved.profiles, 'both profiles are now saved').toHaveLength(2);
    } finally {
      await app.close();
    }
  });

  /** Adds a second, fully-configured profile through the real UI and leaves the shell connected to it. */
  const addSecondProfileViaUI = async (shell) => {
    await openSettings(shell);
    await addProfileBtn(shell).click({ force: true });
    await shell.waitForTimeout(1000);
    await serverPathField(shell).fill(SECOND_SERVER);
    await profileNameField(shell).fill(SECOND_NAME);
    await saveRunBtn(shell).click({ force: true, timeout: 10000 });
    await shell.waitForTimeout(5000);
  };

  test('with two saved profiles, cold launch shows a picker instead of connecting directly', async () => {
    test.setTimeout(90000);
    let { app, shell } = await launchShell();
    await addSecondProfileViaUI(shell);
    expect(readSettings().profiles, 'two profiles are genuinely saved now').toHaveLength(2);
    await app.close();

    // Cold relaunch is the actual thing under test -- a fresh process, no UI state carried over.
    ({ app, shell } = await launchShell());
    try {
      const onChooser = await isOnProfileChooser(shell);
      expect(onChooser, 'two saved profiles force a manual pick on cold launch').toBe(true);

      const teachWindow = teachWindowOf(app);
      expect(teachWindow, 'no teach webview opens on its own while the picker is showing').toBeUndefined();

      // And picking one proceeds normally from there.
      await shell.getByText('QA-V2', { exact: true }).first().click({ force: true });
      await shell.waitForTimeout(4000);
      const teachAfterPick = teachWindowOf(app);
      expect(teachAfterPick, 'picking a tile opens the teach webview').not.toBeUndefined();
      expect(teachAfterPick.url()).toContain('172.18.2.85');
    } finally {
      await app.close();
    }
  });

  test('removing a profile and Save & Run reverts to single-profile, direct-connect behaviour', async () => {
    test.setTimeout(120000);
    let { app, shell } = await launchShell();
    await addSecondProfileViaUI(shell);
    expect(readSettings().profiles, 'two profiles are genuinely saved now').toHaveLength(2);
    await app.close();

    // Fresh launch lands on the picker (proven by the previous test). CONFIRMED LIVE: the Settings screen
    // renders incompletely (missing the Server Path / Profile Name fields) when reached directly from the
    // picker -- pick a profile first (the normal flow) so Settings is reached via the proven admin-menu path.
    ({ app, shell } = await launchShell());
    await shell.getByText('QA-V2', { exact: true }).first().click({ force: true });
    await shell.waitForTimeout(3000);
    await openSettings(shell);
    await profileTab(shell, SECOND_NAME).click({ force: true });
    await shell.waitForTimeout(500);
    await removeProfileBtn(shell).click({ force: true });
    await shell.waitForTimeout(1000);
    await saveRunBtn(shell).click({ force: true, timeout: 10000 });
    await shell.waitForTimeout(4000);
    expect(readSettings().profiles, 'back down to one saved profile').toHaveLength(1);
    await app.close();

    // Cold relaunch: should be direct-connect again, no picker.
    ({ app, shell } = await launchShell());
    try {
      const onChooser = await isOnProfileChooser(shell);
      expect(onChooser, 'back to single-profile behaviour after removal').toBe(false);
      expect(teachWindowOf(app), 'connects directly again').not.toBeUndefined();
    } finally {
      await app.close();
    }
  });
});
