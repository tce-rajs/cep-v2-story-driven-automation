// Switches this machine between QA servers in one command instead of hand-editing two separate files
// (confirmed live 2026-09-23: doing this by hand is exactly what made a server switch error-prone --
// tce_settings.json got left pointing at the old server while .env pointed at the new one, and vice versa).
//
// Updates BOTH places a server URL is configured:
//   1. C:\Users\Public\tce_settings.json  -- via scripts/lib/tce-settings.js.
//   2. .env's BASE_URL line -- what config/env.js (and so fixtures/electron-app.js's resolveUrl) uses to
//      build every relative page.goto('./...') call in the specs.
//
// Deliberately does NOT touch credentials (VALID_PIN, USERNAME, PASSWORD, ...): those are per-account
// secrets for whichever server you're pointing at, and this script has no way to know them. It prints a
// reminder instead of guessing. For a full switch (URL + credentials together), use scripts/set-env.js
// instead, which reads a named profile from config/environments/.
//
// Usage:
//   node scripts/set-server.js http://172.18.2.85/teach/
//   node scripts/set-server.js http://172.18.2.85/teach/

const fs = require('fs');
const os = require('os');
const path = require('path');
const { setTceServerUrl } = require('./lib/tce-settings');

const ENV_PATH = path.join(__dirname, '..', '.env');

function fail(message) {
  console.error(`\nset-server: ${message}`);
  process.exit(1);
}

function main() {
  const url = process.argv[2];
  if (!url) {
    fail(
      'missing URL argument.\n\n  Usage: node scripts/set-server.js <teach-url>\n  Example: node scripts/set-server.js http://172.18.2.85/teach/'
    );
  }
  if (!/^https?:\/\/.+\/teach\/?$/i.test(url)) {
    fail(
      `"${url}" doesn't look like a teach URL (expected something ending in /teach/, e.g. http://172.18.2.85/teach/).`
    );
  }
  const normalized = url.endsWith('/') ? url : `${url}/`;

  let result;
  try {
    result = setTceServerUrl(normalized);
  } catch (err) {
    fail(err.message);
  }
  if (result.droppedCount > 0) {
    console.log(`Dropping ${result.droppedCount} extra saved profile(s) -- this script keeps exactly one.`);
  }
  updateEnvFile(normalized);

  console.log(`
Switched to: ${normalized}

  tce_settings.json -> profiles[0].path updated
  .env               -> BASE_URL updated

REMINDER: credentials were NOT touched. VALID_PIN / VALID_PIN_2 / INVALID_PIN / SCHOOL_NAME /
SCHOOL_SEARCH_TERM / USERNAME / PASSWORD in .env still need to match an account that actually
exists on this server, or every test will fail at sign-in. Update those by hand, or use
"npm run set-env <name>" to switch URL + credentials together from a saved profile.
`);
}

function updateEnvFile(url) {
  if (!fs.existsSync(ENV_PATH)) {
    fail(`${ENV_PATH} not found. Copy .env.example to .env first (see CLAUDE.md's setup steps).`);
  }
  const lines = fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/);
  let found = false;
  const updated = lines.map((line) => {
    if (/^\s*BASE_URL\s*=/.test(line)) {
      found = true;
      return `BASE_URL=${url}`;
    }
    return line;
  });
  if (!found) updated.unshift(`BASE_URL=${url}`);
  fs.writeFileSync(ENV_PATH, updated.join(os.EOL));
}

main();
