// WB-11 — A teacher's day on one topic: write, sign out, come back, pan, write again (nothing ever cleared)
// Source: CEPV2_Stories/06_Whiteboard.md
//
// Data: 'longSession' (Class 12A Physics, 3.1) -- a board that is NEVER cleared (owner's request, 2026-09-27): each run
// adds three more sessions of handwriting to what earlier runs left, like a real classroom board filling up, and checks
// that everything written before -- in this run and in earlier runs -- is still there, unchanged, and not duplicated.
//
// Needs to close and relaunch the whole client between sessions, so it uses launchWithRetry() directly (like
// LOG-01-14 / WB-08-04) instead of the suite's fixtures.

const { test, expect } = require('@playwright/test');
const { launchWithRetry } = require('../../fixtures/electron-app');
const { App } = require('../../pages/app');
const { TouchInput } = require('../../pages/touch-input');
const { layoutHandwriting, lessonText } = require('../../pages/lib/handwriting');

const openClient = async () => {
  const client = await launchWithRetry();
  const app = new App(client.teachWindow);
  return { client, app };
};

const signInToTopic = async (app) => {
  await app.signIn(process.env.VALID_PIN);
  await app.nav.applyClassMap('longSession');
  await app.toolbar.wbSvg.waitFor({ state: 'visible', timeout: 20000 });
  await app.page.waitForTimeout(3000);
  await app.toolbar.waitForBoardToSettle();
};

/** Every stroke that should be on the board is there, once; returns the board's geometry. */
const expectAllThere = async (app, expected, when) => {
  await expect
    .poll(async () => (await app.content.pathGeometry()).length, {
      message: `${when}: all strokes loaded`,
      timeout: 60000,
    })
    .toBeGreaterThanOrEqual(expected.length);
  const now = await app.content.pathGeometry();
  const missing = expected.filter((d) => !now.includes(d));
  const counts = new Map();
  now.forEach((d) => counts.set(d, (counts.get(d) || 0) + 1));
  const doubled = expected.filter((d) => counts.get(d) > 1);
  expect(missing, `${when}: nothing written earlier is missing`).toHaveLength(0);
  expect(doubled, `${when}: nothing written earlier is doubled`).toHaveLength(0);
  return now;
};

/** Pan to fresh board space below everything written so far (the "slider" move), then handwrite `words` words. */
const writeSession = async (app, how, words, seed) => {
  const touch = new TouchInput(app.page);
  const area = await app.content.writingArea();
  const box = await app.toolbar.wbSvg.boundingBox();
  // Fresh space below everything written before, with the Pan tool (a two-finger drag draws lines instead of
  // panning: bug WB-10-04, left to its own case so it does not spoil this one).
  await app.content.panBelowExistingWriting();
  const draw =
    how === 'finger'
      ? (pts) => touch.fingerStroke(pts, 0)
      : how === 'stylus'
        ? (pts) => touch.penStroke(pts)
        : undefined;
  const pages = layoutHandwriting(lessonText(words), area, { seed, xHeight: how === 'finger' ? 20 : 16 });
  await app.content.startSaveLog();
  await app.content.writeHandwriting(pages, {
    draw,
    nextPage: () => app.content.panUp(area.height + 40),
  });
  const finished = Date.now();
  await expect
    .poll(async () => (await app.content.savedMessages()).some((m) => m.at > finished && /saved/i.test(m.text)), {
      message: `${how} session: "Whiteboard Saved!" after the last word`,
      timeout: 60000,
    })
    .toBe(true);
  await touch.dispose();
  return pages.reduce((n, p) => n + p.words.reduce((m, w) => m + w.strokes.length, 0), 0);
};

test(
  'WB-11-01: a teacher writes over three sessions on one topic (stylus, sign out, finger, app closed, stylus); everything written stays, unchanged and not doubled',
  { tag: ['@long', '@regression'] },
  async () => {
    test.skip(!!process.env.RUN_IN_BROWSER, 'relaunching the desktop client has no browser-mode equivalent');
    test.setTimeout(90 * 60 * 1000);
    const log = [];

    // --- Session 1: stylus, then sign out ---
    let { client, app } = await openClient();
    let kept;
    try {
      await signInToTopic(app);
      const before = await app.content.pathGeometry();
      log.push(`start: ${before.length} strokes already on the board from earlier days`);
      const s1 = await writeSession(app, 'stylus', 100, 61);
      kept = await expectAllThere(app, before, 'session 1 (stylus)');
      expect(kept, 'session 1: the board grew by exactly the strokes written').toHaveLength(before.length + s1);
      log.push(`session 1 (stylus): +${s1} strokes -> ${kept.length}`);
      await app.userMenu.signOut();

      // --- Session 2: sign in again, check, pan, finger ---
      await signInToTopic(app);
      await expectAllThere(app, kept, 'after signing out and in');
      const s2 = await writeSession(app, 'finger', 100, 62);
      const after2 = await expectAllThere(app, kept, 'session 2 (finger)');
      expect(after2, 'session 2: the board grew by exactly the strokes written').toHaveLength(kept.length + s2);
      kept = after2;
      log.push(`session 2 (finger, after sign-out/in): +${s2} strokes -> ${kept.length}`);
    } finally {
      await client.app.close().catch(() => {});
    }

    // --- Session 3: the app was closed; reopen, check, pan, stylus ---
    ({ client, app } = await openClient());
    try {
      await signInToTopic(app);
      await expectAllThere(app, kept, 'after closing and reopening the app');
      const s3 = await writeSession(app, 'stylus', 100, 63);
      const after3 = await expectAllThere(app, kept, 'session 3 (stylus)');
      expect(after3, 'session 3: the board grew by exactly the strokes written').toHaveLength(kept.length + s3);
      kept = after3;
      log.push(`session 3 (stylus, after closing the app): +${s3} strokes -> ${kept.length}`);

      // --- Final: a reload brings back every stroke of every session exactly ---
      await app.page.reload();
      await app.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
      await app.toolbar.waitForBoardToSettle();
      const final = await expectAllThere(app, kept, 'final reload');
      expect(final, 'final: exactly the same number of strokes, nothing extra').toHaveLength(kept.length);
      log.push(`final reload: ${final.length} strokes, all present`);
    } finally {
      test.info().annotations.push({ type: 'note', description: log.join(' | ') });
      await client.app.close().catch(() => {});
    }
  }
);
