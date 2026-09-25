// Shared logic for updating C:\Users\Public\tce_settings.json -- the desktop client's own saved profile,
// external to this repo. Used by both scripts/set-server.js (URL-only switch) and scripts/set-env.js (full
// environment switch, URL + credentials), so the "drop extra profiles, back up first" behavior lives in one
// place rather than being copy-pasted between them.

const fs = require('fs');
const os = require('os');

const TCE_SETTINGS_PATH = process.env.TCE_SETTINGS_PATH || 'C:\\Users\\Public\\tce_settings.json';

/** Sets the client's connected server to `url`, collapsing to exactly one saved profile in the process.
 * CONFIRMED LIVE (client-automation/tests/04-multi-profile.spec.js): with 2+ saved profiles, the client shows a
 * "SELECT PROFILE" picker on launch instead of connecting directly, which the main test suite's launch fixture
 * has no code path for -- every test hangs until timeout. Throws on failure rather than returning a status, so
 * callers fail loudly instead of silently continuing with an unconfigured client. */
function setTceServerUrl(url) {
  if (!fs.existsSync(TCE_SETTINGS_PATH)) {
    throw new Error(
      `${TCE_SETTINGS_PATH} not found. Set TCE_SETTINGS_PATH if the client's profile lives elsewhere on this machine.`
    );
  }
  const raw = fs.readFileSync(TCE_SETTINGS_PATH, 'utf8');
  let settings;
  try {
    settings = JSON.parse(raw);
  } catch (err) {
    throw new Error(`${TCE_SETTINGS_PATH} is not valid JSON (${err.message}). Not touching it.`);
  }
  if (!Array.isArray(settings.profiles) || settings.profiles.length === 0) {
    throw new Error(
      `${TCE_SETTINGS_PATH} has no "profiles" array to update -- its shape may have changed. Not touching it.`
    );
  }
  // Back up the previous version once per run, next to the original, so a bad switch is one copy away from
  // undone -- this file lives outside git, so it has no other safety net.
  fs.writeFileSync(`${TCE_SETTINGS_PATH}.bak`, raw);

  const droppedCount = settings.profiles.length - 1;
  settings.profiles = [{ ...settings.profiles[0], path: url }];
  fs.writeFileSync(TCE_SETTINGS_PATH, JSON.stringify(settings, null, 4) + os.EOL);
  return { droppedCount, settingsPath: TCE_SETTINGS_PATH };
}

module.exports = { setTceServerUrl, TCE_SETTINGS_PATH };
