// Separate Playwright config for client-automation/ -- these tests verify the Tata ClassEdge School desktop
// CLIENT itself (launch behaviour, its Settings screen, profile management, server switching), not the teach
// webapp running inside it (that's the root playwright.config.js + tests/, a different concern).
//
// Kept as its own config, not a project inside the root one, because these tests launch their own Electron
// processes directly (client-automation/fixtures/shell.js), read/write the external tce_settings.json, and
// have no use for the root config's baseURL/viewport/trace settings built around driving the teach webview.

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./global-setup.js'),
  globalTeardown: require.resolve('./global-setup.js'),
  // Every test here reads/writes the one shared, external tce_settings.json and launches real Electron
  // processes -- same "one shared mutable resource" reasoning as the root suite's workers: 1.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 90000,
  reporter: [['list'], ['html', { outputFolder: 'client-automation-report' }]],
});
