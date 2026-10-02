// Playwright config — kept intentionally simple and commented for beginners.
// Full reference: https://playwright.dev/docs/test-configuration

require('dotenv').config();
const os = require('os');
const path = require('path');
const { defineConfig, devices } = require('@playwright/test');
const { BASE_URL } = require('./config/env');

// Folder-name-safe "current date and time" (no colons, since Windows
// paths can't contain them) — used to give each run's archived report
// its own timestamped folder. Computed once, when the run starts.
function reportTimestamp() {
  const pad = (n) => String(n).padStart(2, '0');
  const d = new Date();
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_` +
    `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
  );
}

// `npx playwright test --list` (used constantly for sanity checks -- does
// this config/fixture change still resolve every test with no import
// errors?) runs every reporter, including the html one below, even though
// ZERO tests actually execute. Confirmed live: that was silently filling
// playwright-report-archive/ with reports that have no real pass/fail data,
// and at high enough volume even pushed genuine completed-run reports out
// past archive-readme-reporter.js's own retention cap. Route the archive
// folder outside the project during --list so nothing accumulates in the
// repo for a run that never really happened; archive-readme-reporter.js's
// own onEnd separately skips writing a README for the same reason.
const isListOnly = process.argv.includes('--list');
const archiveFolder = isListOnly
  ? path.join(os.tmpdir(), 'playwright-list-scratch', reportTimestamp())
  : `playwright-report-archive/report_${reportTimestamp()}`;

module.exports = defineConfig({
  // Where our test files live.
  testDir: './tests',

  // IMPORTANT: every test in this suite shares ONE live login/account
  // against the real QA app (no test-account-per-worker isolation exists
  // here) -- "current class", popup state, and the session itself are all
  // shared, mutable state. Running tests in parallel means multiple tests
  // fight over that same state at once (one switches class mid-way through
  // another's assertion, etc.), which is exactly what makes a run look like
  // "almost everything is failing" when using a tool (like UI mode) that
  // doesn't get a manual --workers=1 flag. Force serial execution here by
  // default so this is safe regardless of how the suite is invoked.
  fullyParallel: false,
  workers: 1,

  // Fail the build on CI if someone leaves a `.only` in the code.
  forbidOnly: !!process.env.CI,

  // Retry failing tests automatically on CI (flaky network etc.), not locally.
  retries: process.env.CI ? 2 : 0,

  // Desktop client mode (fixtures/electron-app.js, the default `page` fixture
  // for every spec now) can retry a fresh app launch up to 3 times when the
  // client's own connection-error screen shows up (see that file), each
  // attempt taking ~10-15s -- comfortably exceeding Playwright's 30s default
  // test timeout on fixture setup ALONE before a test even starts. Confirmed
  // live: without this, a real 3-attempt retry fails with Playwright's own
  // generic "Test timeout of 30000ms exceeded while setting up 'page'"
  // instead of ever reaching that fixture's own clear blocker error. Spec
  // files that legitimately need even more than this already call their own
  // `test.setTimeout(...)` and are unaffected either way.
  timeout: 90000,

  // HTML report you can open after a run with `npm run report`
  // (always the LATEST run, overwritten each time — same as before).
  //
  // The default 'html' reporter overwrites playwright-report/ on every
  // run, so a report is only ever one `npm test` away from being lost.
  // The second entry below writes an extra, untouched copy per run into
  // playwright-report-archive/<run start time>/, so past reports stay
  // safe even after you run the suite again. The third entry drops a
  // README.md into that same archive folder explaining how to open it.
  reporter: [
    // Console output while the run is happening (pass/fail per test as it
    // finishes) -- the html reporters below only give you something to look
    // at after the whole run ends.
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
    ['html', { outputFolder: archiveFolder, open: 'never' }],
    ['./scripts/archive-readme-reporter.js', { outputFolder: archiveFolder }],
    // Plain-language summary at the end of every run (works / known bug / known bug gone? / new failure /
    // environment / skipped), also saved as test-results/RESULT-SUMMARY.md.
    ['./scripts/result-summary-reporter.js'],
    // Machine-readable results of every real run, one file per run (a small rerun must not replace a full run's
    // results). scripts/build-workbook.js takes each test's latest result across them for the master workbook's
    // "Last run result" column. Not written for --list, which runs no tests.
    ...(isListOnly ? [] : [['json', { outputFile: `report/runs/run_${reportTimestamp()}.json` }]]),
  ],

  use: {
    // Every test can call page.goto('/login') instead of the full URL.
    baseURL: BASE_URL,

    // Run with a real, visible browser window by default. UI mode has no
    // "show browser" toggle in this Playwright version -- this config
    // setting is the only way to make UI mode (which can't be given a
    // --headed CLI flag of its own) show the browser while it runs. Set
    // back to true (or delete this line, true is the default) if you ever
    // need faster/invisible runs, e.g. on a headless CI machine.
    headless: false,

    // The real app runs on large classroom displays (interactive flat
    // panels) -- 1920x1080 is this project's confirmed standard size. Most
    // spec files already set this themselves via their own test.use(), but
    // ~30 files never did, silently falling back to Playwright's small
    // 1280x720 default -- which, in headed mode on a real monitor, visibly
    // renders the app into only part of the screen (confirmed live: at
    // 1280x720 the canvas genuinely only fills that smaller area; at
    // 1920x1080 it correctly fills the whole window). Setting it here
    // makes every file consistent regardless of whether it overrides it.
    // Re-enabled (2026-09-14): only matters for legacy browser mode (the desktop-client fixture
    // ignores this entirely). CONFIRMED LIVE: `viewport` alone only controls the PAGE's internal
    // content area via CDP emulation -- it does NOT resize the actual OS browser window, which
    // still opened maximized to the real monitor's native resolution regardless. The real fix is
    // an explicit --window-size launch arg below, which controls the actual window; `viewport` is
    // kept in sync with it so the page's reported size matches what's really on screen.
    viewport: { width: 1920, height: 1080 },

    launchOptions: {
      args: [
        '--window-size=1920,1080',
        '--window-position=0,0',
        // Stand-in camera/mic for camera-gated features (quiz AIR card launch, Learning Shorts).
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ],
    },

    // Capture a trace whenever a test fails -- 'on-first-retry' (the previous
    // setting) only produces a trace on retry attempts, so a local run
    // (retries: 0 above) never got one for its very first, only failure.
    // 'retain-on-failure' captures on every failed attempt, retried or not,
    // and deletes the trace for passing tests automatically.
    trace: 'retain-on-failure',

    // Take a screenshot only when a test fails.
    screenshot: 'only-on-failure',

    // Keep a video of failing tests too -- this suite drives a lot of
    // timing-sensitive UI (drag/drop, canvas drawing, popup animations)
    // where a single failure screenshot often isn't enough to tell what
    // actually happened; a short video usually is.
    video: 'retain-on-failure',
  },

  // REMOVED (2026-09-14): this used to be 3 projects -- chromium, plus firefox/webkit scoped to
  // just RESP-05 for a real cross-browser check. Since the switch to desktop client mode, EVERY
  // spec (including responsive.spec.js's RESP-05) imports from fixtures/electron-app.js, which
  // always launches the real Tata ClassEdge School.exe regardless of a project's `use.browserName`
  // -- so the firefox/webkit projects never actually drove Firefox or WebKit, they just reran
  // RESP-05 two more times through the SAME Electron client under a misleading label. Confirmed
  // live: no real browser has ever launched in this suite's default run. Down to a single project,
  // renamed from 'chromium' to 'client' -- Playwright requires every test to belong to a named
  // project (it's a structural requirement, the name itself has no effect on what runs, and the
  // fixture ignores `use.browserName` entirely either way), but the reporter prints whatever that
  // project is called, and 'chromium' was misleading people into thinking a browser was involved.
  projects: [
    {
      name: 'client',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
