// Fixture for testing the Tata ClassEdge School desktop client's own SHELL app -- the launcher/profile/settings
// layer -- as opposed to ../../fixtures/electron-app.js at the project root, which drives the TEACH WEBAPP
// running inside it. These are a different concern and need different tooling: this suite launches fresh
// Electron processes per test (most of what it checks is COLD-LAUNCH behaviour, which only shows on a fresh
// process) and reads/writes C:\Users\Public\tce_settings.json directly, the client's own external config file.
//
// CONFIRMED LIVE (2026-09-23): the shell's admin menu is a checkbox-hack toggle (#adminToggle, bottom-right,
// three dots) that reveals Record Screen / Desktop / Settings / Keyboard / Volume / Exit. Settings is reached
// differently depending on how many profiles are saved:
//   - Exactly 1 profile: the client connects straight to it, no picker -- Settings is behind #adminToggle.
//   - 2+ profiles: cold launch shows a "SELECT PROFILE" chooser screen FIRST, with its own visible red
//     "Settings" BUTTON (not the admin-menu's <a> link) -- see CLIENT-04.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const base = require('@playwright/test');
const { _electron: electron } = base;
const fs = require('fs');
const os = require('os');

const CLIENT_EXE_PATH =
  process.env.CLASSEDGE_CLIENT_EXE ||
  'C:\\Users\\v_crystalQA3\\AppData\\Local\\Programs\\tceclient\\Tata ClassEdge School.exe';
const SETTINGS_PATH = process.env.TCE_SETTINGS_PATH || 'C:\\Users\\Public\\tce_settings.json';

function readSettings() {
  return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
}

function writeSettings(settings) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 4) + os.EOL);
}

/** Raw text snapshot, for a test's own beforeEach/afterEach backup-and-restore -- every test in this suite
 * mutates the one shared, external tce_settings.json, so each one must leave it exactly as found. */
function backupSettingsRaw() {
  return fs.readFileSync(SETTINGS_PATH, 'utf8');
}

function restoreSettingsRaw(raw) {
  fs.writeFileSync(SETTINGS_PATH, raw);
}

/** Replace the saved profiles with exactly one, known-good entry, so a test that needs the single-profile
 * precondition doesn't depend on whatever an earlier test left behind. */
function forceSingleProfile({ title, url }) {
  const settings = readSettings();
  const base = settings.profiles[0] || {};
  settings.profiles = [
    {
      ...base,
      title,
      value: base.value || 'profile2',
      path: url,
    },
  ];
  writeSettings(settings);
}

async function launchShell() {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    executablePath: CLIENT_EXE_PATH,
    args: ['--env=qa', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    env,
  });
  const shell = await app.firstWindow();
  await shell.waitForTimeout(3000);
  return { app, shell };
}

function teachWindowOf(app) {
  return app.windows().find((w) => w.url().includes('/teach/'));
}

/** Opens the Settings screen from wherever the shell currently is -- the direct-connect admin menu, or the
 * SELECT PROFILE chooser's own Settings button (see the file header for why these differ). */
async function openSettings(shell) {
  const onChooser = await isOnProfileChooser(shell);
  if (onChooser) {
    await shell.locator('button', { hasText: 'Settings' }).first().click({ force: true, timeout: 10000 });
  } else {
    await shell.locator('#adminToggle').click({ force: true });
    await shell.waitForTimeout(500);
    await shell.locator('a.item', { hasText: 'Settings' }).first().click({ force: true, timeout: 10000 });
  }
  await shell.waitForTimeout(1500);
}

/** Selects a profile tab within the (already open) Settings screen by its title. */
function profileTab(shell, title) {
  // CONFIRMED LIVE: there can be more than one ".profile-tab" element carrying this exact text -- a hidden one
  // (an Angular artifact, never proven to be anything more specific) ahead of the real, visible, clickable tab
  // in DOM order. The :visible pseudo-class filters to the one that's actually on screen, rather than assuming
  // a fixed position.
  return shell.locator('.profile-tab:visible', { hasText: title }).first();
}

/** True if the shell is currently showing the multi-profile chooser (2+ saved profiles) rather than having
 * connected directly. See openSettings() above for why this is a case-insensitive regex, not exact text. */
async function isOnProfileChooser(shell) {
  return shell
    .getByText(/select profile/i)
    .isVisible()
    .catch(() => false);
}

const serverPathField = (shell) => shell.locator('textarea[placeholder="Server URL"]').first();
const profileNameField = (shell) => shell.locator('input[placeholder="Profile Name"]').first();
const saveRunBtn = (shell) => shell.locator('button', { hasText: 'Save & Run' }).first();
const addProfileBtn = (shell) => shell.locator('.add-profile').first();
const removeProfileBtn = (shell) => shell.locator('.remove-profile').first();

module.exports = {
  test: base.test,
  expect: base.expect,
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
  readSettings,
  writeSettings,
  backupSettingsRaw,
  restoreSettingsRaw,
  forceSingleProfile,
  SETTINGS_PATH,
};
