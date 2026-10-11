// Shared steps for the end-to-end flows (tests/00-flows, CEPV2_Stories/00_EndToEndFlows.md).
// Each flow walks one feature through its whole life the way a teacher really uses it, so the same small steps come
// back in many flows: where the teacher is (class, topic), what is on the board (every stroke's outline and every text
// box), a sign-out and sign-in, a reload, and a second device (a plain browser session, own storage) for the same
// teacher. They live here so each flow file holds only its own steps and checks.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('@playwright/test');
const { expect } = require('../../fixtures');
const { BASE_URL } = require('../../config/env');
const { App } = require('../../pages/app');
const { applyClassMap } = require('../../config/moduleClassMap');

const TEST_DATA = path.join(__dirname, '..', '..', 'test-data');

// The classes the main teacher (raj.shinde) teaches, from Recent Classes (9 Oct 2026).
const TEACHER_CLASSES = [
  ['Class 9', 'A', 'Science'],
  ['Class 10', 'A', 'Science'],
  ['Class 12', 'A', 'Computer Science'],
  ['Class 12', 'A', 'Physics'],
  ['Class 5', 'A', 'Mathematics'],
  ['Class 10', 'A', 'Mathematics'],
  ['Class 11', 'A', 'Mathematics'],
  ['Class 10', 'A', 'Sanskrit Literature'],
  ['Class 10', 'A', 'Political Science'],
];
const classLabel = (g, d, s) => `${g.replace('Class ', '')} ${d} ${s}`;

const squash = (t) =>
  String(t || '')
    .replace(/\s+/g, ' ')
    .trim();

/** The class and topic the teacher is on, as the class bar shows them. */
async function whereAmI(app) {
  return {
    cls: squash(await app.nav.currentClassBtn.innerText().catch(() => '')),
    topic: squash(await app.nav.currentChapterTopicBtn.innerText().catch(() => '')),
  };
}

/** Every stroke on the board (its outline, in board coordinates: the same after a pan, zoom or reload). */
async function boardStrokes(app) {
  await app.toolbar.wbSvg.waitFor({ state: 'visible', timeout: 20000 });
  return app.toolbar.allPaths.evaluateAll((ps) => ps.map((p) => p.getAttribute('d')).filter(Boolean));
}

/** The text of every text box on the board. */
async function boardTexts(app) {
  return app.page.evaluate(() =>
    [...document.querySelectorAll('[data-qa-id="wb-drawing-container"] svg foreignObject')]
      .map((e) => (e.textContent || '').trim())
      .filter(Boolean)
  );
}

/** True when a text box on the board holds `text`. */
async function onBoard(app, text) {
  return (await boardTexts(app)).some((t) => t.includes(text));
}

/** Wait for a "Whiteboard Saved!" that comes after this call (the autosave countdown is about 10 s). */
async function waitForAutosave(app, timeout = 45000) {
  await app.content.startSaveLog();
  const since = Date.now();
  await expect
    .poll(async () => (await app.content.savedMessages()).some((m) => m.at >= since && /saved/i.test(m.text)), {
      message: 'the board autosaved ("Whiteboard Saved!")',
      timeout,
    })
    .toBe(true);
}

/** One pen stroke on fresh space; returns its outline. */
async function writeStroke(app, from = { x: 520, y: 420 }, to = { x: 820, y: 500 }) {
  await app.toolbar.penStroke(from, to);
  return app.toolbar.paths.last().getAttribute('d');
}

/** A stroke, a rectangle and a text box carrying `tag`, on fresh space. Returns what was added. */
async function writeSample(app, tag) {
  const before = new Set(await boardStrokes(app));
  await app.toolbar.penStroke({ x: 420, y: 360 }, { x: 680, y: 410 });
  await app.toolbar.chooseShape('gtDrawRect');
  await app.toolbar.drawStroke({ x: 760, y: 330 }, { x: 940, y: 450 }, 10);
  await app.whiteboard.insertTextAndType(420, 520, tag);
  await app.page.keyboard.press('Escape');
  await app.toolbar.selectTool('gtSelect');
  const strokes = (await boardStrokes(app)).filter((d) => !before.has(d));
  return { strokes, text: tag };
}

/** Reload the client's teach page (the client's own reload, which keeps the session) and wait for the board. */
async function reloadSignedIn(app) {
  await app.page.reload();
  await app.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
  await app.toolbar.wbSvg.waitFor({ state: 'visible', timeout: 20000 });
  await app.page.waitForTimeout(2500);
  await app.toolbar.waitForBoardToSettle();
}

/** Sign out through the User menu, then sign in again with `pin`, and open `classMap` if given. */
async function signOutAndIn(app, pin = process.env.VALID_PIN, classMap = null) {
  await app.userMenu.signOut();
  await app.page.waitForTimeout(2000);
  await app.signIn(pin);
  if (classMap) await app.nav.applyClassMap(classMap);
  await app.toolbar.waitForBoardToSettle();
}

/** Hand the panel to another teacher: sign out whoever is signed in, sign in with `pin`, open `classMap` if given. */
async function switchTeacher(app, pin, classMap = null) {
  if (await app.login.avatar.isVisible().catch(() => false)) await app.userMenu.signOut();
  await app.page.waitForTimeout(1500);
  await app.signIn(pin);
  if (classMap) await app.nav.applyClassMap(classMap);
  await app.toolbar.waitForBoardToSettle();
}

/** A second device for the same teacher: a separate browser (own process, own storage) signed in with `pin` and
 * brought to `classMap`. Returns { app, close }. The client cannot open a second window of its own, so the second
 * device is a plain browser on the same server, as a teacher's laptop would be. */
async function openSecondDevice(pin = process.env.VALID_PIN, classMap = null) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1920, height: 1080 } });
  const second = new App(await context.newPage());
  try {
    await second.signIn(pin);
    if (classMap) await applyClassMap(second.nav, classMap);
    await second.page.waitForTimeout(1500);
    await second.toolbar.waitForBoardToSettle();
  } catch (e) {
    await browser.close();
    throw e;
  }
  return { app: second, close: () => browser.close().catch(() => {}) };
}

/** An App on the worker's desktop client window, signed out (for tests that take `workerApp` instead of `app`). */
async function clientApp(workerApp) {
  const app = new App(workerApp.teachWindow);
  if (!workerApp.teachWindow.url().includes('/teach/')) await workerApp.teachWindow.goto('./');
  if (await app.login.avatar.isVisible().catch(() => false)) await app.userMenu.signOut();
  return app;
}

/** Close the worker's desktop client -- or, with `crash`, kill its process as a crash would -- and start a fresh
 * one. The worker's client state (`workerApp`) is updated in place, so later tests use the new client. Returns an App
 * on the new client's teach window (a fresh start is signed out). Only for tests that take `workerApp` and not
 * `page` / `app` / `user`, whose window this closes. */
async function relaunchClient(workerApp, { crash = false } = {}) {
  const { launchWithRetry } = require('../../fixtures/electron-app');
  if (crash) {
    workerApp.app.process().kill('SIGKILL');
    await new Promise((resolve) => setTimeout(resolve, 3000));
  } else {
    await workerApp.app.close().catch(() => {});
  }
  const next = await launchWithRetry();
  workerApp.app = next.app;
  workerApp.teachWindow = next.teachWindow;
  return new App(next.teachWindow);
}

/** A copy of a test-data file under a unique name in the temp folder (so its Playlist card can be told apart). */
function uniqueCopy(relative, prefix = 'AutoTest') {
  const src = path.join(TEST_DATA, relative);
  if (!fs.existsSync(src)) throw new Error(`test-data file missing: ${relative} (run scripts/make-test-data.js)`);
  const dest = path.join(os.tmpdir(), `${prefix}-${Date.now()}${path.extname(src)}`);
  fs.copyFileSync(src, dest);
  return dest;
}

/** A 5-digit PIN that is not `avoid` (PINs are unique across the school, so each run picks a new one). */
function newPin(...avoid) {
  for (;;) {
    const pin = String(10000 + Math.floor(Math.random() * 90000));
    if (!avoid.includes(pin) && !/^(\d)\1+$/.test(pin)) return pin;
  }
}

/** Walk the current class's chapters (and the first topics of each) until `found()` is true; returns true if it was.
 * Used where a flow needs a topic holding a certain kind of resource and the class map names no such topic. */
async function findTopicWhere(app, found, { chapters = 6, topics = 3 } = {}) {
  if (await found()) return true;
  for (let c = 0; c < chapters; c++) {
    for (let t = 0; t < topics; t++) {
      const ok = await app.nav
        .goToChapterTopic(c, t)
        .then(() => true)
        .catch(() => false);
      if (!ok) break;
      await app.playlist.ensureDrawerVisible();
      await app.page.waitForTimeout(1500);
      if (await found()) return true;
    }
  }
  return false;
}

/** Visible widgets on the board (Clock, Ruler, Protractor, ... render as lib-* elements or widget wrappers). */
async function widgetsOnBoard(page) {
  return page.evaluate(
    () =>
      [...document.querySelectorAll('body *')].filter((e) => {
        const tag = e.tagName.toLowerCase();
        const isWidget =
          (tag.startsWith('lib-') && !/^lib-(quiz|code|pdf|player)/.test(tag)) ||
          (typeof e.className === 'string' && /\bwidget-(wrapper|container)\b/.test(e.className));
        if (!isWidget) return false;
        const r = e.getBoundingClientRect();
        return r.width > 20 && r.height > 20;
      }).length
  );
}

/** Close every widget on the board (each widget's own close control). */
async function closeWidgets(app) {
  for (let i = 0; i < 6; i++) {
    const close = app.page
      .locator('lib-clock .mycloseClock')
      .or(app.toolbar.widgetCloseBtn)
      .or(app.page.locator('[class*="widget"] [class*="close" i]'))
      .filter({ visible: true })
      .first();
    if (!(await close.isVisible().catch(() => false))) return;
    await close.click({ force: true, timeout: 2000 }).catch(() => {});
    await app.page.waitForTimeout(500);
  }
}

module.exports = {
  TEST_DATA,
  TEACHER_CLASSES,
  classLabel,
  squash,
  whereAmI,
  boardStrokes,
  boardTexts,
  onBoard,
  waitForAutosave,
  writeStroke,
  writeSample,
  reloadSignedIn,
  signOutAndIn,
  switchTeacher,
  openSecondDevice,
  relaunchClient,
  clientApp,
  uniqueCopy,
  newPin,
  findTopicWhere,
  widgetsOnBoard,
  closeWidgets,
};
