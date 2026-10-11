// Exploration probes (tools/exploration) and clean-up (tools/cleanup): one-off scripts used to walk the app and learn selectors. They are kept out
// of tests/ so a normal `npx playwright test` never runs them (some create data, e.g. Revision Tests).
// Run one on purpose: npx playwright test --config=playwright.explore.config.js tools/exploration/<file>.spec.js
const base = require('./playwright.config');

module.exports = { ...base, testDir: './tools', testIgnore: [] };
