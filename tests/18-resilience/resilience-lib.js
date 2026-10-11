// Shared steps for the Resilience specs (CEPV2_Stories/18_Resilience.md). Every board written on here is the
// 'toolbarGeneral' topic (9A Science 4.1), always on fresh space below what is already there: nothing is erased. The
// only clear is RSL-04-05 / RSL-05-04's, on the scratch board (tests/05-toolbar/scratch-board.js).

const { chromium, expect } = require('@playwright/test');
const { BASE_URL } = require('../../config/env');
const { App } = require('../../pages/app');
const { pinForModule } = require('../../config/moduleClassMap');
const { launchWithRetry } = require('../../fixtures/electron-app');

const BOARD = 'toolbarGeneral';

/** The outline (`d`) of every stroke on the board, the teacher's earlier writing included. */
const allStrokes = (app) => app.toolbar.allPaths.evaluateAll((els) => els.map((e) => e.getAttribute('d')));

/** Draw `n` short strokes in a grid (one path each); returns their outlines in the order drawn. */
async function writeStrokes(app, n, { x = 220, y = 260, cols = 20 } = {}) {
  const written = [];
  for (let i = 0; i < n; i++) {
    const sx = x + (i % cols) * 50;
    const sy = y + (Math.floor(i / cols) % 8) * 60;
    await app.toolbar.penStroke({ x: sx, y: sy }, { x: sx + 30, y: sy + 35 });
    written.push(await app.toolbar.paths.last().getAttribute('d'));
  }
  return written;
}

/** How many of `written` are missing from the board and how many are on it more than once. */
async function compareBoard(app, written) {
  const counts = new Map();
  for (const d of await allStrokes(app)) counts.set(d, (counts.get(d) || 0) + 1);
  return {
    missing: written.filter((d) => !counts.has(d)).length,
    doubled: written.filter((d) => counts.get(d) > 1).length,
  };
}

/** Wait until every stroke in `written` has loaded on the board (up to a minute), then compare. */
async function boardHas(app, written, timeout = 60000) {
  await expect
    .poll(async () => (await compareBoard(app, written)).missing, { timeout, message: 'the strokes load' })
    .toBe(0)
    .catch(() => {});
  return compareBoard(app, written);
}

/** Sign in (the board's account) and open the board topic, then wait for the board to settle. */
async function signInToBoard(app, key = BOARD) {
  await app.signIn(pinForModule(key));
  await app.nav.applyClassMap(key);
  await app.toolbar.waitForBoardToSettle();
}

/** Wait for the autosave confirmation after the last stroke (up to `ms`). */
async function waitForSave(app, ms = 40000) {
  await app.content.waitForSaved(ms).catch(() => {});
  await app.page.waitForTimeout(2000);
}

/** The app's own calls fail as if the network were down; the page itself stays loaded. Pass to page.route('**\/*'). */
const offline = (route) =>
  ['fetch', 'xhr', 'websocket', 'eventsource'].includes(route.request().resourceType())
    ? route.abort('internetdisconnected')
    : route.continue();

/** A second device (the teacher's laptop): a separate browser session with its own storage, signed in to the board's
 * account on the board topic. The desktop client cannot open a second tab. Returns { laptop, close }. */
async function openLaptop(key = BOARD) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1920, height: 1080 } });
  const laptop = new App(await context.newPage());
  await signInToBoard(laptop, key);
  return { laptop, close: () => browser.close().catch(() => {}) };
}

/** Launch a client of its own (not the worker's), run `body(app, client)` and always close it. */
async function withClient(body) {
  const client = await launchWithRetry();
  try {
    return await body(new App(client.teachWindow), client);
  } finally {
    await client.app.close().catch(() => {});
  }
}

/** End the client process at once, as a power cut or a crash would (no clean close). */
async function killClient(client) {
  const proc = client.app.process();
  proc.kill('SIGKILL');
  await new Promise((resolve) => {
    if (proc.exitCode !== null) return resolve();
    proc.once('exit', resolve);
    setTimeout(resolve, 10000);
  });
}

/** Close the worker's client -- or, with `kill`, end its process at once as a power cut or a crash would -- and
 * start a fresh one. `workerApp` is updated in place, so later tests use the new client. Returns an App on the new
 * client (a fresh start is signed out). Only for tests that take `workerApp` and not `page` / `app` / `user`. */
async function restartClient(workerApp, { kill = false } = {}) {
  if (kill) await killClient(workerApp);
  else await workerApp.app.close().catch(() => {});
  const next = await launchWithRetry();
  workerApp.app = next.app;
  workerApp.teachWindow = next.teachWindow;
  return new App(next.teachWindow);
}

/** Press Undo (or Redo) `n` times, waiting for each to take effect on the board. */
async function undoRedo(app, toolId, n) {
  for (let i = 0; i < n; i++) {
    const before = await app.toolbar.allPaths.count();
    await app.toolbar.tool(toolId).click({ force: true });
    await expect
      .poll(() => app.toolbar.allPaths.count(), { timeout: 5000 })
      .not.toBe(before)
      .catch(() => {});
  }
}

/** Grow the board on screen to at least `target` strokes, writing short strokes in a grid as fast as the board takes
 * them (CDP input, see pages/touch-input.js). Every 1,000th stroke the grid moves a little, so no two strokes have the
 * same outline. Returns how many strokes were added. For the scratch board only: the tests that use it clear it. */
async function growBoard(app, target) {
  const { TouchInput } = require('../../pages/touch-input');
  const input = new TouchInput(app.page);
  await app.toolbar.selectTool('gtPen');
  const box = await app.toolbar.wbSvg.boundingBox();
  const area = await app.content.writingArea();
  const cols = Math.floor(area.width / 24);
  const rows = Math.floor(area.height / 30);
  let have = await app.toolbar.allPaths.count();
  let added = 0;
  try {
    for (let i = have; have < target; i++) {
      const cell = i % (cols * rows);
      const shift = Math.floor(i / (cols * rows)) % 12;
      const x = box.x + area.x + (cell % cols) * 24 + shift;
      const y = box.y + area.y + Math.floor(cell / cols) * 30 + shift;
      await input.mouseStroke([
        { x, y },
        { x: x + 8, y: y + 10 },
        { x: x + 14, y: y + 18 },
      ]);
      added++;
      if (added % 200 === 0) have = await app.toolbar.allPaths.count();
      else have++;
    }
  } finally {
    await input.dispose();
  }
  return added;
}

/** Sign in to the scratch board (9A Science 8.2), check it really is the scratch board, and start it empty. */
async function openScratchBoard(app) {
  const { expectOnScratchBoard, emptyScratchBoard } = require('../05-toolbar/scratch-board');
  await signInToBoard(app, 'scratchBoard');
  await expectOnScratchBoard(app);
  await emptyScratchBoard(app);
}

/** Leave the scratch board empty again (the only place a test may clear). */
async function emptyScratch(app) {
  const { emptyScratchBoard } = require('../05-toolbar/scratch-board');
  await emptyScratchBoard(app);
  await waitForSave(app);
}

module.exports = {
  BOARD,
  allStrokes,
  writeStrokes,
  compareBoard,
  boardHas,
  signInToBoard,
  waitForSave,
  offline,
  openLaptop,
  withClient,
  killClient,
  restartClient,
  undoRedo,
  growBoard,
  openScratchBoard,
  emptyScratch,
};
