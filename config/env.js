// Single source of truth for environment-derived config. Both
// playwright.config.js (legacy browser mode) and fixtures/electron-app.js
// (desktop client mode) need the same BASE_URL fallback -- this used to be
// two independently-maintained copies of the same string.
require('dotenv').config();

// The only target server (owner, 2026-09-28). The old QA server (ce-qa-school.devstudi.com) must not be used, so it is
// deliberately not a fallback any more.
const BASE_URL = process.env.BASE_URL || 'http://172.18.2.85/teach/';

module.exports = { BASE_URL };
