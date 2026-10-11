// Shared steps for the Desktop Client specs (CEPV2_Stories/19_DesktopClient.md).
// The specs drive the worker's own client (`workerApp`) and, where a case is about starting the client in a certain
// state (a wrong server, two profiles, no network, a second copy), a client of their own, started with the shell
// fixture of client-automation/ (client-automation/fixtures/shell.js). The worker's client is closed first (one
// client per profile) and started again afterwards, and the settings file (C:\Users\Public\tce_settings.json) is
// always put back exactly as it was.

const { expect } = require('@playwright/test');
const { App } = require('../../pages/app');
const { launchWithRetry } = require('../../fixtures/electron-app');
const shell = require('../../client-automation/fixtures/shell');

/** The teach window's own <webview> contents, as the client's main process sees them, reloaded or loaded from there
 * (the client's own way: the window and the client URL are kept). */
const webviewDo = (app, action) =>
  app.evaluate(({ webContents }, act) => {
    const view = webContents.getAllWebContents().find((w) => w.getType() === 'webview');
    if (!view) return false;
    if (act === 'reload') view.reload();
    return true;
  }, action);

/** Switch the network off (or on) for every part of a client, the way Chromium's DevTools "Offline" does. */
const setClientOffline = (app, offline) =>
  app.evaluate(({ webContents, session }, off) => {
    const sessions = new Set([session.defaultSession, ...webContents.getAllWebContents().map((w) => w.session)]);
    for (const s of sessions)
      if (off) s.enableNetworkEmulation({ offline: true });
      else s.disableNetworkEmulation();
    return sessions.size;
  }, offline);

/** Everything the client shows as text: its shell window and, if open, its teach window. */
async function clientText(app) {
  const parts = [];
  for (const w of app.windows())
    parts.push(await w.evaluate(() => (document.body ? document.body.innerText : '')).catch(() => ''));
  return parts.join('\n').replace(/\s+/g, ' ').trim();
}

/** Start the worker's client again (after a test closed it for one of its own). */
async function relaunchWorker(workerApp) {
  const next = await launchWithRetry();
  workerApp.app = next.app;
  workerApp.teachWindow = next.teachWindow;
  return new App(next.teachWindow);
}

/** Close the worker's client, optionally change the settings file (`mutate(settings)`), start a client of the test's
 * own and run `body({ app, shell })`. Always closes that client, puts the settings file back and starts the
 * worker's client again. */
async function withOwnClient(workerApp, { mutate } = {}, body) {
  await workerApp.app.close().catch(() => {});
  const backup = shell.backupSettingsRaw();
  let own;
  try {
    if (mutate) {
      const settings = shell.readSettings();
      mutate(settings);
      shell.writeSettings(settings);
    }
    own = await shell.launchShell();
    return await body(own);
  } finally {
    if (own) await own.app.close().catch(() => {});
    shell.restoreSettingsRaw(backup);
    await relaunchWorker(workerApp);
  }
}

/** Wait (up to `timeout`) for a client's teach window to show a usable board in Guest Mode; returns its App or null. */
async function waitForBoard(app, timeout = 60000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const teach = shell.teachWindowOf(app);
    if (teach) {
      const ui = new App(teach);
      const ready = await ui.toolbar.wbSvg.isVisible().catch(() => false);
      if (ready) return ui;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return null;
}

/** Show the teach page as a screen of `width` x `height` CSS pixels at `scale` (Windows scaling), via DevTools.
 * Returns an undo function. */
async function emulateScreen(page, { width, height, scale = 1 }) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });
  await page.waitForTimeout(1500);
  return async () => {
    await cdp.send('Emulation.clearDeviceMetricsOverride').catch(() => {});
    await cdp.detach().catch(() => {});
    await page.waitForTimeout(1000);
  };
}

/** The main controls that must always be reachable: each one's box, and whether it is fully on screen. */
async function layoutProblems(app) {
  const vp = await app.header.viewportSize();
  const controls = {
    toolbar: app.toolbar.container,
    'header logo': app.header.logoImage,
    'header date': app.header.calendar,
    'class bar': app.nav.currentClassBtn,
    'topic bar': app.nav.currentChapterTopicBtn,
    'Playlist strip': app.playlist.drawerBtn,
    'Add resource (+)': app.playlist.addResourcesTrigger,
    Pen: app.toolbar.tool('gtPen'),
    Undo: app.toolbar.tool('gtUndo'),
  };
  const problems = [];
  for (const [name, el] of Object.entries(controls)) {
    const b = await el
      .first()
      .boundingBox()
      .catch(() => null);
    const on =
      b && b.width > 0 && b.x >= -1 && b.y >= -1 && b.x + b.width <= vp.width + 1 && b.y + b.height <= vp.height + 1;
    if (!on) problems.push(`${name} ${b ? JSON.stringify(b) : 'not shown'} (screen ${vp.width}x${vp.height})`);
  }
  return problems;
}

module.exports = {
  expect,
  shell,
  webviewDo,
  setClientOffline,
  clientText,
  relaunchWorker,
  withOwnClient,
  waitForBoard,
  emulateScreen,
  layoutProblems,
};
