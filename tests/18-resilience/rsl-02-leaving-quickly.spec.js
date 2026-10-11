// RSL-02 — Writing survives leaving the board within seconds
// Source: CEPV2_Stories/18_Resilience.md
// Board: 'toolbarGeneral' (9A Science 4.1), on fresh space below the existing writing (nothing erased). Strokes are
// recorded by their outlines and looked for, one by one, afterwards.
// RSL-02-02 ends the worker's client process (as a power cut would) and starts a new one (signed out by design).
// RSL-02-06 (Windows sleep / the panel switched off) is not automated: the test cannot put the machine to sleep.

const { test, expect } = require('../../fixtures');
const { clientApp } = require('../00-flows/flow-helpers');
const { BOARD, writeStrokes, boardHas, compareBoard, signInToBoard, restartClient } = require('./resilience-lib');
const { getClassMap } = require('../../config/moduleClassMap');

test.describe('RSL-02 Writing survives leaving the board within seconds', () => {
  test.describe.configure({ timeout: 300000 });

  test.describe('the client is ended', () => {
    test.skip(!!process.env.RUN_IN_BROWSER, 'ending the desktop client process has no browser equivalent');

    test(
      'RSL-02-02: writing, then ending the client process 60 s later, everything is saved',
      { tag: ['@negative'] },
      async ({ workerApp }) => {
        let app = await clientApp(workerApp);
        await signInToBoard(app);
        await app.content.startOnFreshSpace();
        const written = await writeStrokes(app, 5);
        await app.page.waitForTimeout(60000); // well past the autosave countdown
        app = await restartClient(workerApp, { kill: true });
        await signInToBoard(app);
        const { missing, doubled } = await boardHas(app, written);
        expect({ missing, doubled }, `all ${written.length} strokes are on the board, once`).toEqual({
          missing: 0,
          doubled: 0,
        });
      }
    );
  });

  test.describe('on the board', () => {
    test.use({ classMap: BOARD, freshSpace: true });

    test(
      'RSL-02-03: writing, then switching topic within 10 s, the writing is on the original topic and not on the new one',
      { tag: ['@negative'] },
      async ({ user }) => {
        const { chapterIndex, topicIndex } = getClassMap(BOARD);
        const written = await writeStrokes(user, 3);
        // Straight away (inside the autosave countdown): the next topic of the same chapter. Only read there.
        await user.nav.goToChapterTopic(chapterIndex, topicIndex + 1);
        await expect(user.nav.currentChapterTopicBtn, 'set-up: on the next topic').toHaveText(
          new RegExp(`^\\s*${chapterIndex + 1}\\.${topicIndex + 2}\\s`),
          { timeout: 30000 }
        );
        await user.toolbar.waitForBoardToSettle();
        const onOther = await compareBoard(user, written);
        await user.nav.goToChapterTopic(chapterIndex, topicIndex);
        await user.toolbar.waitForBoardToSettle();
        const onOriginal = await boardHas(user, written);
        expect(onOther.missing, 'none of the writing landed on the new topic').toBe(written.length);
        expect(onOriginal.missing, 'all of it is on the original topic').toBe(0);
      }
    );

    test(
      'RSL-02-05: writing, then opening a Playlist asset full-screen within 10 s, the board writing is kept',
      { tag: ['@negative'] },
      async ({ user }) => {
        await user.playlist.ensureDrawerVisible();
        await user.playlist.ensureResourcesPresent();
        const cards = user.player.worksheetCards.or(user.player.videoCards).or(user.player.imageCards);
        if (!(await cards.count())) throw new Error('DATA MISSING ON THIS SERVER: no worksheet, video or image card');
        const written = await writeStrokes(user, 3);
        await user.player.openResourceCard(cards);
        expect(await user.player.isPlayerOpen(20000), 'set-up: the asset opened over the board').toBe(true);
        await user.page.waitForTimeout(15000); // past the autosave countdown, with the asset still open
        await user.player.closePlayer();
        await user.page.reload();
        await user.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
        await user.toolbar.waitForBoardToSettle();
        const { missing, doubled } = await boardHas(user, written);
        expect({ missing, doubled }, 'the board writing is kept, once').toEqual({ missing: 0, doubled: 0 });
      }
    );
  });
});
