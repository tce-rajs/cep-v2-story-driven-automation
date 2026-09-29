// WB-11 — A teacher's day on one topic: write, sign out, come back, write again, close the app, reload (nothing ever
// cleared)
// Source: CEPV2_Stories/06_Whiteboard.md
//
// Data: 'longSession' (Class 12A Physics, 3.1) -- a board that is NEVER cleared (owner's request, 2026-09-27): each run
// adds more handwriting to what earlier runs left, like a real classroom board filling up, and checks that everything
// written before -- in this run and in earlier runs -- is still there, unchanged, and not duplicated.
//
// One test per result, in the order of the day. Each test notes the board as it finds it, so none depends on another
// having passed. Some need to close and relaunch the whole client, so this file uses launchWithRetry() directly (like
// LOG-01-14 / WB-08-04) instead of the suite's fixtures, and every test starts its own client.

const { test, expect } = require('@playwright/test');
const { launchWithRetry } = require('../../fixtures/electron-app');
const { App } = require('../../pages/app');
const { TouchInput } = require('../../pages/touch-input');
const { layoutHandwriting, lessonText } = require('../../pages/lib/handwriting');

const signInToTopic = async (app) => {
  await app.signIn(process.env.VALID_PIN);
  await app.nav.applyClassMap('longSession');
  await app.toolbar.wbSvg.waitFor({ state: 'visible', timeout: 20000 });
  await app.page.waitForTimeout(3000);
  await app.toolbar.waitForBoardToSettle();
};

/** Launch the client, sign in and open the topic; runs `body(app, client)` and always closes the client. */
const withClient = async (body) => {
  const client = await launchWithRetry();
  const app = new App(client.teachWindow);
  try {
    await signInToTopic(app);
    return await body(app, client);
  } finally {
    await client.app.close().catch(() => {});
  }
};

/** The board once every stroke has loaded (at least `atLeast` of them). */
const loadedBoard = async (app, atLeast) => {
  await expect
    .poll(async () => (await app.content.pathGeometry()).length, { message: 'all strokes loaded', timeout: 60000 })
    .toBeGreaterThanOrEqual(atLeast);
  return app.content.pathGeometry();
};

/** Assert the board holds everything in `earlier` exactly once, plus exactly `added` new strokes. */
const expectBoard = (now, earlier, added, when) => {
  const counts = new Map();
  now.forEach((d) => counts.set(d, (counts.get(d) || 0) + 1));
  const missing = earlier.filter((d) => !counts.has(d));
  const doubled = earlier.filter((d) => counts.get(d) > 1);
  test.info().annotations.push({
    type: 'note',
    description: `${when}: ${earlier.length} strokes before, ${now.length} now (${added} added); missing ${missing.length}, doubled ${doubled.length}`,
  });
  expect(
    { missing: missing.length, doubled: doubled.length, total: now.length },
    `${when}: everything from before is there once, plus exactly the ${added} new strokes`
  ).toEqual({ missing: 0, doubled: 0, total: earlier.length + added });
};

/** Pan below everything written so far, handwrite `words` words, and give autosave up to a minute to finish. */
const writeSession = async (app, how, words, seed) => {
  const touch = new TouchInput(app.page);
  try {
    const area = await app.content.writingArea();
    // Fresh space with the Pan tool (a two-finger drag draws lines instead of panning: bug WB-10-04).
    await app.content.panBelowExistingWriting();
    const draw = how === 'finger' ? (pts) => touch.fingerStroke(pts, 0) : (pts) => touch.penStroke(pts);
    const pages = layoutHandwriting(lessonText(words), area, { seed, xHeight: how === 'finger' ? 20 : 16 });
    await app.content.startSaveLog();
    await app.content.writeHandwriting(pages, { draw, nextPage: () => app.content.panUp(area.height + 40) });
    const finished = Date.now();
    // Set-up for the next part of the day (the save message itself is WB-10-25/28's check): wait for it, up to a minute.
    for (let i = 0; i < 60; i++) {
      if ((await app.content.savedMessages()).some((m) => m.at > finished && /saved/i.test(m.text))) break;
      await app.page.waitForTimeout(1000);
    }
    return pages.reduce((n, p) => n + p.words.reduce((m, w) => m + w.strokes.length, 0), 0);
  } finally {
    await touch.dispose();
  }
};

test.describe('WB-11 A teacher’s day on one topic', () => {
  test.beforeEach(() => {
    test.skip(!!process.env.RUN_IN_BROWSER, 'relaunching the desktop client has no browser-mode equivalent');
  });

  const sessionTest = (id, how, when, seed) =>
    test(
      `${id}: ${when}, the teacher handwrites about 100 words with a ${how}; the board keeps everything from before, once, plus exactly the new strokes`,
      { tag: ['@long', '@regression'] },
      async () => {
        test.setTimeout(30 * 60 * 1000);
        await withClient(async (app) => {
          const before = await app.content.pathGeometry();
          const added = await writeSession(app, how, 100, seed);
          expectBoard(await loadedBoard(app, before.length), before, added, `${how} session`);
        });
      }
    );

  sessionTest('WB-11-01', 'stylus', 'In the morning', 61);

  test(
    'WB-11-02: after signing out and back in, everything on the board is still there, once',
    { tag: ['@long', '@regression'] },
    async () => {
      test.setTimeout(5 * 60 * 1000);
      await withClient(async (app) => {
        const before = await loadedBoard(app, 0);
        await app.userMenu.signOut();
        await signInToTopic(app);
        expectBoard(await loadedBoard(app, before.length), before, 0, 'after signing out and in');
      });
    }
  );

  sessionTest('WB-11-03', 'finger', 'After signing in again', 62);

  test(
    'WB-11-04: after closing and reopening the app, everything on the board is still there, once',
    { tag: ['@long', '@regression'] },
    async () => {
      test.setTimeout(5 * 60 * 1000);
      const before = await withClient((app) => loadedBoard(app, 0));
      await withClient(async (app) => {
        expectBoard(await loadedBoard(app, before.length), before, 0, 'after closing and reopening the app');
      });
    }
  );

  test(
    'WB-11-05: at the end of the day, a reload brings back every stroke of every session exactly, once',
    { tag: ['@long', '@regression'] },
    async () => {
      test.setTimeout(5 * 60 * 1000);
      await withClient(async (app) => {
        const before = await loadedBoard(app, 0);
        await app.page.reload();
        await app.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
        await app.toolbar.waitForBoardToSettle();
        expectBoard(await loadedBoard(app, before.length), before, 0, 'after a reload');
      });
    }
  );
});
