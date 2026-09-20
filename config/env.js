// Single source of truth for environment-derived config. Both
// playwright.config.js (legacy browser mode) and fixtures/electron-app.js
// (desktop client mode) need the same BASE_URL fallback -- this used to be
// two independently-maintained copies of the same string.
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'https://ce-qa-school.devstudi.com/teach/';

module.exports = { BASE_URL };
