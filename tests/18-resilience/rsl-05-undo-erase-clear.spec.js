// RSL-05 — Undo, erase and clear are saved exactly as seen
// Source: CEPV2_Stories/18_Resilience.md
// RSL-05-01/02/05: 'toolbarGeneral' (9A Science 4.1), on fresh space below the existing writing; Undo only takes
// back what the test itself wrote. RSL-05-03 (a 5,000-stroke page) and RSL-05-04 (a mistaken Clear) run on the
// scratch board (9A Science 8.2) and leave it empty.

const { test, expect } = require('../../fixtures');
const {
  BOARD,
  allStrokes,
  writeStrokes,
  compareBoard,
  boardHas,
  waitForSave,
  undoRedo,
  growBoard,
  openScratchBoard,
  emptyScratch,
} = require('./resilience-lib');

/** Reload the client's page (its own reload) and wait for the board. */
async function reload(app) {
  await app.page.reload();
  await app.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
  await app.toolbar.wbSvg.waitFor({ state: 'visible', timeout: 30000 });
  await app.page.waitForTimeout(3000);
  await app.toolbar.waitForBoardToSettle(20);
}

test.describe('RSL-05 Undo, erase and clear are saved exactly as seen', () => {
  test.describe.configure({ timeout: 20 * 60 * 1000 });

  test.describe('on the board', () => {
    test.use({ classMap: BOARD, freshSpace: true });

    test(
      'RSL-05-01: write 200 strokes, Undo 150, wait for autosave, reload; exactly 50 strokes remain',
      { tag: ['@edge'] },
      async ({ user }) => {
        const written = await writeStrokes(user, 200);
        await waitForSave(user);
        await undoRedo(user, 'gtUndo', 150);
        const kept = written.slice(0, 50);
        await waitForSave(user);
        await reload(user);
        const first50 = await compareBoard(user, kept);
        const undone = await compareBoard(user, written.slice(50));
        expect(
          { kept: 50 - first50.missing, undoneBack: written.length - 50 - undone.missing },
          'the first 50 strokes and none of the 150 undone'
        ).toEqual({ kept: 50, undoneBack: 0 });
      }
    );

    test(
      'RSL-05-02: Undo 150 and Redo 150, wait for autosave, reload; all 200 strokes, each once',
      { tag: ['@edge'] },
      async ({ user }) => {
        const written = await writeStrokes(user, 200);
        await waitForSave(user);
        await undoRedo(user, 'gtUndo', 150);
        await undoRedo(user, 'gtRedo', 150);
        await waitForSave(user);
        await reload(user);
        const { missing, doubled } = await boardHas(user, written);
        expect({ missing, doubled }, 'all 200 strokes, each once').toEqual({ missing: 0, doubled: 0 });
      }
    );

    test(
      'RSL-05-05: after Undo straight after an autosave, a reload does not bring the undone stroke back',
      { tag: ['@edge'] },
      async ({ user }) => {
        const written = await writeStrokes(user, 3);
        await user.content.waitForSaved(40000);
        await undoRedo(user, 'gtUndo', 1); // straight after "Whiteboard Saved!"
        await waitForSave(user);
        await reload(user);
        const firstTwo = await compareBoard(user, written.slice(0, 2));
        const last = await compareBoard(user, written.slice(2));
        expect(
          { keptMissing: firstTwo.missing, undoneBack: 1 - last.missing },
          'the two kept strokes are there, the undone one stays undone'
        ).toEqual({ keptMissing: 0, undoneBack: 0 });
      }
    );
  });

  test.describe('on the scratch board', () => {
    test(
      'RSL-05-03: erasing one word in the middle of a 5,000-stroke page removes only that word after a reload',
      { tag: ['@edge', '@long'] },
      async ({ app }) => {
        await openScratchBoard(app);
        try {
          await growBoard(app, 5000);
          // The "word": four short strokes in the middle of the page.
          const area = await app.content.writingArea();
          const cx = area.x + area.width / 2;
          const cy = area.y + area.height / 2;
          await app.toolbar.selectTool('gtPen');
          const before = new Set(await allStrokes(app));
          for (let i = 0; i < 4; i++)
            await app.toolbar.drawStroke({ x: cx + i * 14, y: cy - 12 }, { x: cx + i * 14, y: cy + 12 }, 8);
          const word = (await allStrokes(app)).filter((d) => !before.has(d));
          expect(word.length, 'set-up: the word is on the board').toBe(4);
          // The strokes well away from the word (centre more than 120 px from it): the eraser never comes near them.
          const box = await app.toolbar.wbSvg.boundingBox();
          const far = await app.toolbar.allPaths.evaluateAll(
            (els, c) =>
              els
                .filter((e) => {
                  const r = e.getBoundingClientRect();
                  return Math.hypot(r.x + r.width / 2 - c.x, r.y + r.height / 2 - c.y) > 120;
                })
                .map((e) => e.getAttribute('d')),
            { x: box.x + cx + 21, y: box.y + cy }
          );
          await waitForSave(app, 90000);
          // Erase the word: three passes of the eraser across it.
          for (const dy of [-10, 0, 10])
            await app.toolbar.eraseDrag({ x: cx - 15, y: cy + dy }, { x: cx + 57, y: cy + dy });
          await waitForSave(app, 90000);
          await reload(app);
          const wordBack = await compareBoard(app, word);
          const farBack = await compareBoard(app, far);
          test.info().annotations.push({
            type: 'note',
            description: `${far.length} strokes away from the word; after the reload ${farBack.missing} of them are missing.`,
          });
          expect(wordBack.missing, 'the word is gone after the reload').toBe(word.length);
          expect(farBack.missing, 'every stroke away from the word is still there').toBe(0);
        } finally {
          await emptyScratch(app).catch(() => {});
        }
      }
    );

    test(
      'RSL-05-04: after a mistaken Clear Whiteboard and a reload, the board can be recovered (Undo, or a version in Whiteboard History)',
      { tag: ['@negative'] },
      async ({ app }) => {
        await openScratchBoard(app);
        try {
          const written = await writeStrokes(app, 5);
          await waitForSave(app);
          await app.toolbar.pressClearWhiteboard(app.whiteboard);
          await waitForSave(app);
          await reload(app);
          // Way 1: Undo after the reload.
          await undoRedo(app, 'gtUndo', 1);
          const byUndo = 5 - (await compareBoard(app, written)).missing;
          // Way 2: Whiteboard History still lists a version holding the strokes.
          await app.userMenu.openProfileMenu();
          await app.userMenu.wbHistoryBtn.click({ force: true });
          const rows = await app.userMenu.wbHistoryRows();
          await app.userMenu.wbHistoryPanel
            .getByText('✕', { exact: true })
            .first()
            .click({ force: true })
            .catch(() => {});
          const versionWithStrokes = rows.some((r) => r.strokes >= written.length);
          test.info().annotations.push({
            type: 'note',
            description: `Recovery after Clear + reload: Undo brought back ${byUndo} of 5 strokes; History versions: ${JSON.stringify(rows.slice(0, 5))}.`,
          });
          expect(byUndo === 5 || versionWithStrokes, 'the cleared board can be recovered').toBe(true);
        } finally {
          await emptyScratch(app).catch(() => {});
        }
      }
    );
  });
});
