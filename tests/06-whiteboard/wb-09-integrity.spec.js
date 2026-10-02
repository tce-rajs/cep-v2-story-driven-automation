// WB-09 — Whiteboard data integrity (what the teacher sees is what is saved)
// Source: CEPV2_Stories/06_Whiteboard.md
// Data: 'toolbarGeneral' (Class 12A Physics, 1.1) and, for the class-switch case, Class 11A Mathematics 1.1 (its board
// is only read, never written). The 12A board is never cleared (owner rule 2026-09-29): each test writes on fresh
// space below the teacher's writing, and compares only its own strokes.
//
// Every case compares the board's exact geometry (each stroke's `d`, in board coordinates, independent of zoom and pan)
// before and after a reload, so a stroke that comes back moved, resized, duplicated or missing is caught.

const { test, expect } = require('../../fixtures');
const { layoutHandwriting, lessonText } = require('../../pages/lib/handwriting');
const { pinForModule } = require('../../config/moduleClassMap');

const reload = async (user) => {
  await user.page.reload();
  await user.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
  await user.toolbar.wbSvg.waitFor({ state: 'visible', timeout: 20000 });
  await user.page.waitForTimeout(3000);
  await user.toolbar.waitForBoardToSettle();
};

const write = async (user, words, seed, area) =>
  user.content.writeHandwriting(
    layoutHandwriting(lessonText(words), area || (await user.content.writingArea()), { seed })
  );

/** Wait for a fresh "Whiteboard Saved!" (the autosave countdown is ~10 s). */
const saved = async (user) => {
  await user.content.startSaveLog();
  const since = Date.now();
  await expect
    .poll(async () => (await user.content.savedMessages()).some((m) => m.at >= since && /saved/i.test(m.text)), {
      message: 'autosave confirmed',
      timeout: 40000,
    })
    .toBe(true);
};

/** Note the other class's board (Class 11A Mathematics, 1.1, read only), write on 12A, then switch to 11A at once --
 * no wait for the save, as a teacher moving to the next period. Returns the other board before, and what was written. */
const writeThenSwitchClass = async (user) => {
  await user.nav.resetToClass('Class 11', 'A', 'Mathematics');
  await user.nav.goToChapterTopic(0, 0);
  await user.toolbar.waitForBoardToSettle();
  const otherBefore = await user.content.pathGeometry();

  await user.nav.applyClassMap('toolbarGeneral');
  await user.content.startOnFreshSpace();
  await write(user, 15, 36);
  const mine = await user.content.pathGeometry();
  await user.nav.resetToClass('Class 11', 'A', 'Mathematics');
  await user.nav.goToChapterTopic(0, 0);
  await user.page.waitForTimeout(12000);
  await user.toolbar.waitForBoardToSettle();
  return { otherBefore, mine };
};

test.describe('WB-09 Whiteboard data integrity', () => {
  test.use({ classMap: 'toolbarGeneral', freshSpace: true });
  test.describe.configure({ timeout: 10 * 60 * 1000 });

  test.afterEach(async ({ app }) => {
    await app.nav.applyClassMap('toolbarGeneral').catch(() => {});
  });

  // Owner rule (2026-09-29): tests never wipe the teacher's board. These two are ABOUT Clear Whiteboard, which wipes
  // the whole topic, so they wait for the owner to decide how Clear may be tested.
  const CLEAR_WIPES_BOARD =
    "Clear Whiteboard erases the teacher's whole board; owner rule 2026-09-29 forbids it. Waiting for the owner to decide how Clear may be tested (e.g. a dedicated scratch topic).";

  test(
    'WB-09-01: after Clear Whiteboard and a reload, nothing comes back',
    { tag: ['@regression'] },
    async ({ user }) => {
      test.fixme(true, CLEAR_WIPES_BOARD);
      await write(user, 25, 31);
      await saved(user);
      await user.toolbar.pressClearWhiteboard(user.whiteboard);
      await expect(user.toolbar.allPaths, 'the board is empty on screen').toHaveCount(0);
      await user.page.waitForTimeout(12000); // let the clear autosave
      await reload(user);
      await expect(user.toolbar.allPaths, 'no strokes come back after a reload').toHaveCount(0);
    }
  );

  test(
    'WB-09-02: Undo straight after Clear Whiteboard leaves the saved board matching what is on screen',
    { tag: ['@edge'] },
    async ({ user }) => {
      test.fixme(true, CLEAR_WIPES_BOARD);
      await write(user, 20, 32);
      await saved(user);
      await user.toolbar.pressClearWhiteboard(user.whiteboard);
      await user.toolbar.tool('gtUndo').click({ force: true });
      await user.page.waitForTimeout(12000);
      const onScreen = await user.content.pathGeometry();
      test.info().annotations.push({
        type: 'note',
        description: `After Clear + Undo the screen shows ${onScreen.length} strokes.`,
      });
      await reload(user);
      expect(await user.content.pathGeometry(), 'after a reload the board is exactly what was on screen').toEqual(
        onScreen
      );
    }
  );

  test('WB-09-03: erased handwriting stays erased after a reload', { tag: ['@regression'] }, async ({ user }) => {
    const area = await user.content.writingArea();
    await write(user, 40, 33, area);
    await saved(user);
    const before = await user.toolbar.pathCount();
    // Rub out a band across the middle of the writing, as a teacher correcting a line would.
    await user.toolbar.eraseDrag(
      { x: area.x + 40, y: area.y + 80 },
      { x: area.x + Math.min(area.width, 900), y: area.y + 90 },
      40
    );
    await saved(user);
    const afterErase = await user.content.pathGeometry();
    expect(
      afterErase.length === before && afterErase.length > 0 ? 'unchanged' : 'changed',
      'the eraser removed something'
    ).toBe('changed');
    await reload(user);
    expect(await user.content.pathGeometry(), 'the board after a reload is exactly the erased board').toEqual(
      afterErase
    );
  });

  test(
    'WB-09-04: handwriting written while zoomed in comes back in the same place after a reload',
    { tag: ['@edge'] },
    async ({ user }) => {
      const tb = user.toolbar;
      await tb.openToolPanel('gtZoom');
      for (let i = 0; i < 4; i++) await tb.zoomInBtn.click({ force: true });
      await tb.closePanelByTappingOutside();
      const zoom = await user.content.zoomPercent();
      await write(user, 25, 34);
      await saved(user);
      const geometry = await user.content.pathGeometry();
      await tb.openToolPanel('gtZoom');
      await tb.zoomResetBtn.click({ force: true });
      await tb.closePanelByTappingOutside();
      await reload(user);
      test.info().annotations.push({ type: 'note', description: `Written at ${zoom}% zoom.` });
      expect(await user.content.pathGeometry(), 'same strokes, same place and size').toEqual(geometry);
    }
  );

  test(
    'WB-09-05: handwriting written far away after a long pan comes back in the same place after a reload',
    { tag: ['@edge'] },
    async ({ user }) => {
      for (let i = 0; i < 8; i++) await user.content.panUp(600);
      await write(user, 25, 35);
      await saved(user);
      const geometry = await user.content.pathGeometry();
      await reload(user);
      expect(await user.content.pathGeometry(), 'same strokes, same place, even far from the start').toEqual(geometry);
    }
  );

  test(
    'WB-09-06: switching class straight after writing does not put the strokes on the other class’s board',
    { tag: ['@regression', '@negative'] },
    async ({ user }) => {
      const { otherBefore, mine } = await writeThenSwitchClass(user);
      const otherAfter = await user.content.pathGeometry();
      expect(
        otherAfter.filter((d) => mine.includes(d)),
        'none of the new strokes are on the other class’s board'
      ).toEqual([]);
      expect(otherAfter, 'the other class’s board is unchanged').toEqual(otherBefore);
    }
  );

  test(
    'WB-09-08: after switching class straight after writing, the strokes are on their own board when the teacher comes back',
    { tag: ['@regression'] },
    async ({ user }) => {
      const { mine } = await writeThenSwitchClass(user);
      await user.nav.applyClassMap('toolbarGeneral');
      await expect
        .poll(() => user.content.pathGeometry(), { message: 'the strokes are on their own board', timeout: 30000 })
        .toEqual(mine);
    }
  );

  test('WB-09-07: a text box with 1,500 characters is saved in full', { tag: ['@edge'] }, async ({ user }) => {
    const text = 'Electric field lines never cross. '.repeat(45).slice(0, 1500);
    await user.whiteboard.insertTextAndType(300, 250, text);
    await user.toolbar.selectTool('gtSelect');
    await saved(user);
    // A text box is an SVG foreignObject (not an HTML element): read its text content.
    const typed = await user.whiteboard.textObjects.last().evaluate((el) => el.textContent || '');
    await reload(user);
    const after = await user.whiteboard.textObjects.last().evaluate((el) => el.textContent || '');
    test
      .info()
      .annotations.push({ type: 'note', description: `Typed ${typed.length} chars; after reload ${after.length}.` });
    expect(after.replace(/\s+/g, ' ').trim(), 'the whole text is back').toBe(text.replace(/\s+/g, ' ').trim());
  });

  // Leaving before the autosave (owner, 2026-09-29): the app saves about 10 s after the teacher stops writing, so the
  // risky moment is leaving inside that window. Closing the app is WB-08-04; switching topic WB-06-09, class WB-09-06/08.
  test(
    'WB-09-09: reloading the app within 10 seconds of writing loses nothing',
    { tag: ['@negative', '@regression', '@bug'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE twice (2026-09-29, 172.18.2.85, v 0.0.232, desktop client): all 31 strokes of
      // 15 words written just before a reload are gone after it. Signing out in the same window keeps them (WB-09-10).
      test.fail(true, 'Reloading within the 10-second autosave countdown loses everything written since the last save');
      await write(user, 15, 41);
      const mine = await user.content.pathGeometry();
      // No wait for "Whiteboard Saved!": reload straight away, inside the countdown.
      await reload(user);
      await user.page.waitForTimeout(5000);
      const back = await user.content.pathGeometry();
      test.info().annotations.push({
        type: 'note',
        description: `${mine.length} strokes written, ${mine.filter((d) => back.includes(d)).length} back after the reload.`,
      });
      expect(
        mine.filter((d) => !back.includes(d)),
        'strokes written just before the reload that are missing'
      ).toEqual([]);
    }
  );

  test(
    'WB-09-10: signing out within 10 seconds of writing loses nothing',
    { tag: ['@negative', '@regression'] },
    async ({ user }) => {
      await write(user, 15, 42);
      const mine = await user.content.pathGeometry();
      // No wait for "Whiteboard Saved!": sign out straight away, inside the countdown, then come back.
      await user.userMenu.signOut();
      await user.page.waitForTimeout(3000);
      await user.signIn(pinForModule('toolbarGeneral'));
      await user.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
      await user.nav.applyClassMap('toolbarGeneral');
      await user.toolbar.waitForBoardToSettle();
      await user.page.waitForTimeout(5000);
      const back = await user.content.pathGeometry();
      test.info().annotations.push({
        type: 'note',
        description: `${mine.length} strokes written, ${mine.filter((d) => back.includes(d)).length} back after signing in again.`,
      });
      expect(
        mine.filter((d) => !back.includes(d)),
        'strokes written just before signing out that are missing'
      ).toEqual([]);
    }
  );
});
