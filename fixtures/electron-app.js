// Custom Playwright fixture for driving the real Tata ClassEdge School desktop
// client (an Electron app), instead of a plain browser.
//
// Why this exists: the client is a native Windows app, not a website. Its main
// window is just a chrome/shell (logo, toolbar, a "connect to local ClassEdge
// box" status panel) — the actual teach webapp (the thing our test cases are
// about: Guest Mode, Sign In, PIN/password, the whiteboard) lives inside a
// <webview> tag, which Electron exposes to Playwright as its OWN separate
// window. So every test here uses THAT window as `page`, not the shell.
//
// Setup this required:
//   1. This machine has ELECTRON_RUN_AS_NODE=1 set globally, which makes any
//      Electron exe run as plain Node instead of opening its GUI. We strip it
//      from the launched process's env.
//   2. The client needs `--env=qa` on its command line, or it silently talks
//      to the prod backend instead of QA.
//   3. C:\Users\Public\tce_settings.json (external, not part of this project)
//      is this machine's saved client profile. It must hold exactly ONE profile
//      whose "path" is the target server, http://172.18.2.85/teach/ (owner,
//      2026-09-28/30 -- the old QA server ce-qa-school.devstudi.com must not be
//      used). Set it with `npm run set-server -- <url>`; assertClientProfile()
//      stops the run otherwise.
//   4. The CLIENT loads the teach link, never the tests (owner, 2026-09-30):
//      the client opens its profile's link with its own settings attached, the
//      fixture only finds that window and checks it, and every reload / return
//      to the start goes through the client (see clientNavigate below).

const fs = require('fs');
const base = require('@playwright/test');
const { _electron: electron } = base;
const { BASE_URL } = require('../config/env');

const CLIENT_EXE_PATH =
  process.env.CLASSEDGE_CLIENT_EXE ||
  'C:\\Users\\v_crystalQA3\\AppData\\Local\\Programs\\tceclient\\Tata ClassEdge School.exe';
const TCE_SETTINGS_PATH = process.env.TCE_SETTINGS_PATH || 'C:\\Users\\Public\\tce_settings.json';
const RECORD_VIDEO_DIR = process.env.RECORD_VIDEO_DIR;

/** Closes the app; when recording, logs the teach window's video path and the close time to videos.jsonl, so a
 * long per-worker video can be cut into per-test clips afterwards (video start = close time - video duration). */
async function closeAndLogVideo(app, teachWindow) {
  const video = RECORD_VIDEO_DIR && teachWindow && teachWindow.video();
  await app.close().catch(() => {});
  if (!video) return;
  const file = await video.path().catch(() => null);
  const line = JSON.stringify({ file, closedAt: Date.now() });
  fs.appendFileSync(require('path').join(RECORD_VIDEO_DIR, 'videos.jsonl'), line + '\n');
}

// Every spec was written against a plain browser `page`, where Playwright's
// own `baseURL` config option lets `page.goto('./')` resolve automatically.
// That resolution only exists for browser contexts Playwright itself creates
// -- the Electron window returned below has no such context option, so an
// unmodified relative goto throws "Cannot navigate to invalid URL" (confirmed
// live). Patch `goto` once here, so every existing spec's `page.goto('./')`,
// `page.goto('./whiteboard')`, etc. keep working unchanged against the real
// client instead of needing ~40 call sites edited individually.
function resolveUrl(url) {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : new URL(url, BASE_URL).toString();
}

// The webview window is created at `about:blank` and only client-side
// navigates to the real teach URL a moment later — the SAME window object,
// no second 'window' event. So `waitForEvent('window', { predicate })`
// checked once at creation time can permanently miss it (confirmed live:
// intermittently hangs the full 30s timeout). Poll every known window
// (existing + newly created) until one's current URL matches, instead of
// relying on a one-shot event/predicate pairing.
async function findTeachWindow(app, timeout = 30000) {
  const isTeachWindow = (w) => w.url().includes('/teach/');
  const candidates = new Set(app.windows());
  const onWindow = (w) => candidates.add(w);
  app.on('window', onWindow);
  try {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      for (const w of candidates) {
        if (isTeachWindow(w)) return w;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`Teach window (URL containing "/teach/") not found within ${timeout}ms`);
  } finally {
    app.off('window', onWindow);
  }
}

// The shell window's own teach `<webview>` has a did-fail-load handler
// that retries once after 2s; if that retry ALSO fails, it locks a flag
// that shows a full-screen "E R R O R # 404 -- Unable to connect
// ClassEdge server" overlay (`.uiverse` in the SHELL's own DOM) permanently
// (confirmed live: sat unchanged for 90s+, does not self-clear on its own).
//
// ROOT CAUSE, confirmed live (2026-09-12, after a full machine restart did
// NOT fix it, ruling out resource exhaustion): this is specifically caused
// by Playwright's OWN required `--inspect`/`--remote-debugging-port` launch
// flags racing with this app's `<webview>` guest-view creation at startup.
// Captured directly from the client's main-process log:
//   "Error occurred in handler for 'GUEST_VIEW_MANAGER_CALL': ERR_FAILED (-2)"
// Confirmed via repeated back-to-back A/B testing: a manually-launched copy
// of this exact same client, same machine, same moment, NEVER shows this --
// only Playwright-launched instances do. A real teacher launching the app
// normally will never encounter this.
//
// Also confirmed: this is CHEAPLY recoverable. The failure is a one-time
// startup race, not a lasting break -- once past it, a plain Playwright-level
// `page.goto()` on the SAME window (bypassing the app's own broken internal
// retry) reliably loads real content within a few seconds. The shell's
// overlay stays visually stuck either way (nothing in the app ever resets
// that flag short of a full relaunch), but the actual webview content is
// what the test drives, and that recovers fine.
//
// So: on suspicion (overlay visible OR webview body suspiciously empty),
// retry navigation on the SAME window first (cheap, ~5-10s) before ever
// falling back to a full app relaunch. Only treat it as a genuine BLOCKER
// if the content is STILL missing after that -- per explicit user decision,
// don't silently ignore a real empty/broken page just because the overlay
// itself is known to be a tooling artifact.
//
// UPDATE (screenshot from the owner, 2026-09-24): this same overlay was seen
// mid-session -- real class/topic content visible underneath, well past
// launch -- not just in the launch-time race described above. That means it
// isn't safe to assume "launch-only, cosmetic, ignore if content recovers"
// in every case. So this is also checked between tests (isWindowHealthy,
// below) and reported explicitly (not just silently retried/relaunched
// around) whenever it's caught at the end of a failed test, so a run where
// this happened is never mistaken for an ordinary app/locator failure.
async function isConnectionErrorShowing(app) {
  const shell = app.windows().find((w) => w.url().includes('app.asar'));
  if (!shell) return false;
  try {
    return await shell.evaluate(() => {
      const panel = document.querySelector('.uiverse');
      if (!panel) return false;
      const style = getComputedStyle(panel);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  } catch {
    return false; // shell window gone/navigating -- don't block on it
  }
}

async function hasRealContent(teachWindow) {
  try {
    const text = await teachWindow.evaluate(() => document.body.innerText.trim());
    return text.length > 20; // confirmed-broken state renders a fully empty body
  } catch {
    return false;
  }
}

async function launchClient() {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  const app = await electron.launch({
    executablePath: CLIENT_EXE_PATH,
    // The two --use-fake-* switches give the client a stand-in camera/microphone and auto-accept the permission
    // prompt, so camera-gated features (the quiz's "Launch AIR Card", Learning Shorts) can be exercised without
    // hardware. They affect getUserMedia only. Remove them if they ever interfere with a launch.
    args: ['--env=qa', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    env,
    // Opt-in (RECORD_VIDEO_DIR): the browser-only `video` config option does nothing for Electron, but the launch
    // option does record the client's windows. One video per launch; see closeAndLogVideo() below.
    ...(RECORD_VIDEO_DIR && { recordVideo: { dir: RECORD_VIDEO_DIR, size: { width: 1280, height: 720 } } }),
  });

  // Make sure the shell window has come up before we look for the webview.
  await app.firstWindow();

  const teachWindow = await findTeachWindow(app);
  await teachWindow.waitForLoadState('domcontentloaded');
  // The webview keeps rendering (fonts, the Guest Mode panel, the Sign In
  // modal) for a bit after domcontentloaded — give it a few seconds so
  // tests don't start clicking before things have settled. This is also
  // enough time for the did-fail-load retry-and-give-up sequence above to
  // resolve one way or the other before we check for it below.
  await teachWindow.waitForTimeout(5000);

  return { app, teachWindow };
}

// If a full relaunch is ever still needed (the cheap same-window retry
// below failed too), don't loop forever -- 2 fresh app instances is plenty
// given the cheap retry already handles the common case.
const MAX_LAUNCH_ATTEMPTS = 2;

// Without this check, a missing client just fails with Playwright's own
// generic "Process failed to launch!" (confirmed live -- no path, no
// reason, nothing actionable), repeated identically on every single test.
// Fail fast with a message that says what's actually wrong.
function assertClientInstalled() {
  if (!fs.existsSync(CLIENT_EXE_PATH)) {
    throw new Error(
      `Tata ClassEdge School client not found at: ${CLIENT_EXE_PATH}\n` +
        `Install the desktop client on this machine, or set CLASSEDGE_CLIENT_EXE ` +
        `in .env to point at its real install location.`
    );
  }
}

// The client must have exactly ONE profile, and it must point at the target server (owner, 2026-09-30).
// CONFIRMED LIVE in client-automation/tests/04-multi-profile.spec.js: with 2+ profiles saved in tce_settings.json,
// cold launch shows a "SELECT PROFILE" chooser screen instead of connecting directly -- every test would hang until
// timeout. And a single profile pointing somewhere else would silently test the wrong server. Fail fast with a
// message that says what's wrong and how to fix it.
const sameUrl = (a, b) => String(a).replace(/\/+$/, '').toLowerCase() === String(b).replace(/\/+$/, '').toLowerCase();
function assertClientProfile() {
  const fix = `Fix: run "npm run set-server -- ${BASE_URL}" (keeps one profile, pointing at ${BASE_URL}).`;
  if (!fs.existsSync(TCE_SETTINGS_PATH)) {
    throw new Error(`BLOCKER: ${TCE_SETTINGS_PATH} not found -- the client has no profile to open. ${fix}`);
  }
  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(TCE_SETTINGS_PATH, 'utf8'));
  } catch (e) {
    throw new Error(`BLOCKER: ${TCE_SETTINGS_PATH} is not valid JSON (${e.message}). ${fix}`);
  }
  const profiles = Array.isArray(settings.profiles) ? settings.profiles : [];
  if (profiles.length !== 1) {
    const titles = profiles.map((p) => p.title).join(', ') || 'none';
    throw new Error(
      `BLOCKER: ${TCE_SETTINGS_PATH} has ${profiles.length} profiles (${titles}); the client must have exactly one. ` +
        `With 2+ the client shows a "SELECT PROFILE" picker instead of connecting. ${fix}`
    );
  }
  if (!sameUrl(profiles[0].path, BASE_URL)) {
    throw new Error(
      `BLOCKER: the client's only profile ("${profiles[0].title}") points at ${profiles[0].path}, not the target ` +
        `server ${BASE_URL}. ${fix}`
    );
  }
  return profiles[0].path;
}

// --- The client loads the link, not the tests (owner, 2026-09-30) ---
// CONFIRMED LIVE (2026-09-30): the client opens the teach app with its own settings in the query string
// (`?cmode=2&...&tceclient=1&webdrop=1&erasersize=150&gesturemode=1...`, from tce_settings.json). A test that loads
// the bare BASE_URL itself drops all of them and is no longer testing the client. F5 and Ctrl+R do nothing in the
// client (a teacher cannot reload), but the client's own main process can reload its teach <webview>, which keeps
// the client's URL and the window. So every reload / "back to the start" below goes through the client itself.

/** Runs `action` ('reload' or 'loadURL') on the client's teach <webview>, from the client's own main process. */
async function clientWebviewDo(app, action, url) {
  return app.evaluate(
    ({ webContents }, [act, target]) => {
      const views = webContents.getAllWebContents().filter((w) => w.getType() === 'webview');
      const view = views.find((w) => /\/(teach|plan)\//.test(w.getURL())) || views[0];
      if (!view) return false;
      if (act === 'reload') view.reload();
      else view.loadURL(target);
      return true;
    },
    [action, url]
  );
}

/** Triggers a client-side navigation and waits for the new document, keeping the same window. */
async function clientNavigate(app, teachWindow, action, url, timeout = 30000) {
  const loaded = teachWindow.waitForEvent('domcontentloaded', { timeout });
  if (!(await clientWebviewDo(app, action, url))) throw new Error('the client has no teach <webview> to navigate');
  await loaded;
  await teachWindow.waitForTimeout(2000);
}

// Same launch-and-recover loop the fixture always used, extracted so both
// the worker's initial launch and a mid-worker recovery relaunch (see the
// `page` fixture below) share one implementation.
async function launchWithRetry() {
  assertClientInstalled();
  const profilePath = assertClientProfile();

  let app, teachWindow;
  for (let attempt = 1; attempt <= MAX_LAUNCH_ATTEMPTS; attempt++) {
    ({ app, teachWindow } = await launchClient());

    if (await isConnectionErrorShowing(app)) {
      // Cheap recovery first: the client's own reload of its teach <webview> (same client URL, same window),
      // bypassing the shell's broken internal retry. A full relaunch below if that does not bring content back.
      await clientNavigate(app, teachWindow, 'reload', null, 20000).catch(() => {});
    }

    if (await hasRealContent(teachWindow)) break;

    await app.close().catch(() => {});
    if (attempt === MAX_LAUNCH_ATTEMPTS) {
      throw new Error(
        `BLOCKER: the client's teach window is still empty/broken after ${MAX_LAUNCH_ATTEMPTS} ` +
          `fresh launches, each with a recovery retry attempted. This is a genuine failure to ` +
          `load real content, not the known cosmetic startup-race overlay (which recovers on ` +
          `retry) -- so this test is failing rather than working around it. Check the QA ` +
          `server/network before re-running.`
      );
    }
  }

  // The URL the client opened by itself, with its own settings (tceclient=1, webdrop, erasersize, ...).
  const clientUrl = teachWindow.url();
  if (!clientUrl.toLowerCase().startsWith(profilePath.toLowerCase()) || !/[?&]tceclient=1\b/.test(clientUrl)) {
    await app.close().catch(() => {});
    throw new Error(
      `BLOCKER: the client opened ${clientUrl}, not its profile's link ${profilePath} with tceclient=1 -- ` +
        `it is not running as the ClassEdge client. Check ${TCE_SETTINGS_PATH} and the client install.`
    );
  }
  teachWindow.clientUrl = clientUrl;

  // page.goto() on a teach-app URL ('./', './whiteboard', BASE_URL...) means "back to the app's start" in every spec
  // and page object: it goes to the client's own URL, loaded by the client, never the bare link. Any other URL
  // (a phone page, an external site) is not a teach-app page and is refused, so no test can drive the teach app
  // through a hand-typed link by mistake.
  teachWindow.goto = async (url, options = {}) => {
    const target = resolveUrl(url);
    if (!target.toLowerCase().startsWith(new URL(BASE_URL).origin.toLowerCase())) {
      throw new Error(`client mode: refusing to load ${target} in the teach window (open it in its own page instead)`);
    }
    await clientNavigate(app, teachWindow, 'loadURL', clientUrl, options.timeout);
    return null;
  };
  // CONFIRMED LIVE (2026-09-20): Playwright's own page.reload() destroys the client's <webview> window. The client's
  // own reload (main process, 2026-09-30) keeps the window, the client URL and the signed-in session.
  teachWindow.reload = async (options = {}) => {
    await clientNavigate(app, teachWindow, 'reload', null, options.timeout);
    return null;
  };
  return { app, teachWindow };
}

// AUD-08: the client used to be relaunched from scratch for every single
// test (~1,000+ full Electron launches per full run, confirmed the
// suite's biggest runtime cost). Launching once per WORKER instead and
// resetting session state between tests keeps each test's actual
// precondition (every spec already logs in itself via loginWithPin, or
// -- for Guest Mode tests like entry.spec.js -- expects to start signed
// out) while cutting relaunches from "per test" to "per worker".
//
// The one real behavioral risk this introduces: reusing the SAME window
// means a test that leaves it signed in, or genuinely broken (e.g.
// entry.spec.js's ENT-07, which documents a confirmed permanent blank
// page after an uncaught router error), would otherwise poison every
// later test in the same worker -- something a fresh-per-test launch
// could never do. resetSession() below handles the sign-in case
// explicitly (sign out via the real UI, the same way a teacher would);
// isWindowHealthy() catches the broken/blank case and forces a full
// relaunch rather than silently handing a bad window to the next test.

/** If currently signed in, signs out via the real UI (avatar -> Sign Out)
 * so the next test starts from the same signed-out Guest Mode baseline a
 * fresh launch would have provided. A no-op if already signed out. */
async function resetSession(teachWindow) {
  const avatar = teachWindow.locator('[data-qa-id="toolbar-user-avatar"]');

  // A test can end away from the teach app -- in Plan Mode (a separate app with no avatar at all) or on a browser
  // error page. The avatar check below would then see "signed out" and skip the sign-out, leaving the next test
  // signed in with no Sign In button to click. Bring the window back to the teach app first, and only in that case
  // wait for the avatar to render (the normal signed-out path stays instant).
  let isSignedIn;
  if (teachWindow.url().includes('/teach/')) {
    isSignedIn = await avatar.isVisible().catch(() => false);
  } else {
    // Back to the client's own start page (its own URL, loaded by the client -- see teachWindow.goto above).
    await teachWindow.goto('./', { timeout: 20000 });
    isSignedIn = await avatar
      .waitFor({ state: 'visible', timeout: 6000 })
      .then(() => true)
      .catch(() => false);
  }
  if (!isSignedIn) return;

  await avatar.click({ force: true, timeout: 5000 });
  const signOutBtn = teachWindow.locator('[data-qa-id="toolbar-profile-signout-btn"]');
  await signOutBtn.waitFor({ state: 'visible', timeout: 5000 });
  await signOutBtn.click({ force: true });
  await avatar.waitFor({ state: 'hidden', timeout: 10000 });
}

/** Cheap health check before reusing a window for the next test -- reuses
 * the same hasRealContent() signal the initial launch already trusts, plus
 * an explicit isClosed() check (a crashed webview can close its own window
 * without the whole Electron app going down), plus the connection-error
 * overlay check (confirmed live 2026-09-24: it can also latch mid-session,
 * not just at launch -- see isConnectionErrorShowing's own comment). */
async function isWindowHealthy(teachWindow, app) {
  if (teachWindow.isClosed()) return false;
  if (await isConnectionErrorShowing(app)) return false;
  return hasRealContent(teachWindow);
}

const clientTest = base.test.extend({
  // One real launch per worker process, not per test.
  workerApp: [
    async ({}, use) => {
      const initial = await launchWithRetry();
      // A plain object, mutated in place (not reassigned) by the `page`
      // fixture below if a mid-worker recovery relaunch is ever needed --
      // every test in this worker reads through the same reference.
      const state = { app: initial.app, teachWindow: initial.teachWindow };
      await use(state);
      await closeAndLogVideo(state.app, state.teachWindow);
    },
    { scope: 'worker', timeout: 100000 },
  ],

  page: [
    async ({ workerApp }, use, testInfo) => {
      let healthy = false;
      try {
        await resetSession(workerApp.teachWindow);
        healthy = await isWindowHealthy(workerApp.teachWindow, workerApp.app);
      } catch {
        healthy = false;
      }

      if (!healthy) {
        await closeAndLogVideo(workerApp.app, workerApp.teachWindow);
        const recovered = await launchWithRetry();
        workerApp.app = recovered.app;
        workerApp.teachWindow = recovered.teachWindow;
      }

      await use(workerApp.teachWindow);

      // A failed test's own error (a timed-out locator, an unexpected URL, ...) doesn't say WHY --
      // if the real cause was this overlay covering the screen mid-test, say so explicitly instead
      // of leaving the report looking like an ordinary app/locator bug. Checked after use(), not
      // before: the overlay latching is itself the failure signal here, so this only fires on a
      // test that already failed.
      if (testInfo.status !== testInfo.expectedStatus && (await isConnectionErrorShowing(workerApp.app))) {
        testInfo.annotations.push({
          type: 'BLOCKER',
          description:
            'The "ERROR #404 -- Unable to connect ClassEdge server" overlay was covering the app when this ' +
            "test failed. Treat this run's result as a connectivity blocker, not a real test/product bug, " +
            'until this is confirmed clear on a rerun.',
        });
        console.error(
          `BLOCKER: "${testInfo.title}" failed with the connection-error overlay showing -- ` +
            `see the test's annotations. Rerun after confirming the QA server is reachable.`
        );
      }
    },
    { timeout: 100000 }, // covers the rare mid-worker recovery relaunch, same as workerApp's own launch
  ],
});

// RUN_IN_BROWSER=1 skips the desktop client and uses Playwright's own browser page instead
// (baseURL, viewport and headed/headless all come from playwright.config.js), so the same
// specs can be watched in a normal browser window. Default is still the desktop client.
const test = process.env.RUN_IN_BROWSER ? base.test : clientTest;

// Exported for tests/03-login's client-reopen regression case, which needs raw control over closing and
// relaunching a whole separate app instance (not just reusing the worker's shared window) -- desktop-client-
// only, so has no RUN_IN_BROWSER equivalent.
module.exports = { test, expect: base.expect, devices: base.devices, launchWithRetry };
