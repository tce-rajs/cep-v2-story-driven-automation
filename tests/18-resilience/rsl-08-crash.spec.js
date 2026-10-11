// RSL-08 — Recovering after a crash
// Source: CEPV2_Stories/18_Resilience.md
// Each test ends the worker's client process at once (as a crash would) and starts a new one; a fresh start is
// signed out by design (LOG-01-14). Board: 'toolbarGeneral' (9A Science 4.1), on fresh space below the existing
// writing (nothing erased).

const { test, expect } = require('../../fixtures');
const { clientApp } = require('../00-flows/flow-helpers');
const { writeStrokes, compareBoard, boardHas, signInToBoard, waitForSave, restartClient } = require('./resilience-lib');

/** Sign in on the worker's client, open the board and move to fresh space. */
async function onBoard(workerApp) {
  const app = await clientApp(workerApp);
  await signInToBoard(app);
  await app.content.startOnFreshSpace();
  return app;
}

test.describe('RSL-08 Recovering after a crash', () => {
  test.skip(!!process.env.RUN_IN_BROWSER, 'crashing the desktop client has no browser equivalent');
  test.describe.configure({ timeout: 300000 });

  test(
    'RSL-08-01: after the client is killed mid-lesson, it restarts and the teacher can sign in',
    { tag: ['@interruption'] },
    async ({ workerApp }) => {
      const before = await onBoard(workerApp);
      await writeStrokes(before, 2);
      const app = await restartClient(workerApp, { kill: true });
      await expect(app.login.guestModeText, 'the client starts again (on Guest Mode)').toBeVisible({ timeout: 30000 });
      await app.signIn();
      await expect(app.login.avatar, 'and the teacher can sign in').toBeVisible();
      await expect(app.toolbar.wbSvg, 'to a working board').toBeVisible({ timeout: 20000 });
    }
  );

  test(
    'RSL-08-02: after a crash mid-autosave, the board opens with a complete earlier version',
    { tag: ['@interruption'] },
    async ({ workerApp }) => {
      let app = await onBoard(workerApp);
      const saved = await writeStrokes(app, 4);
      await waitForSave(app);
      const pending = await writeStrokes(app, 8);
      // Crash the moment the next save goes out (or, if none is seen, as its countdown ends).
      const request = await app.page
        .waitForRequest(
          (r) =>
            ['POST', 'PUT', 'PATCH'].includes(r.method()) &&
            /whiteboard|board|annotation|canvas|drawing|save/i.test(r.url()),
          { timeout: 40000 }
        )
        .catch(() => null);
      test.info().annotations.push({
        type: 'note',
        description: request ? `Crashed as ${request.url().replace(/\?.*$/, '')} went out.` : 'No save request seen.',
      });
      app = await restartClient(workerApp, { kill: true });
      await signInToBoard(app);
      const earlier = await boardHas(app, saved);
      // An earlier version is the board as it was at one moment: the strokes written after the save are missing,
      // never some stroke in the middle. So the strokes kept are the first k of those written, with no gap.
      const present = [];
      for (const d of pending) present.push((await compareBoard(app, [d])).missing === 0);
      const kept = present.filter(Boolean).length;
      test.info().annotations.push({ type: 'note', description: `${kept} of ${pending.length} later strokes kept.` });
      expect(earlier.missing, 'the version saved before the crash is complete').toBe(0);
      expect(present, 'a complete earlier version: the first strokes kept, no gaps').toEqual(
        pending.map((_, i) => i < kept)
      );
    }
  );

  test(
    'RSL-08-03: after a crash, the teacher is told that the last few seconds of writing may not have been saved',
    { tag: ['@negative'] },
    async ({ workerApp }) => {
      let app = await onBoard(workerApp);
      const written = await writeStrokes(app, 3);
      app = await restartClient(workerApp, { kill: true }); // within the autosave countdown
      await signInToBoard(app);
      const { missing } = await compareBoard(app, written);
      test.info().annotations.push({ type: 'note', description: `${missing} of ${written.length} strokes not saved.` });
      if (missing === 0) return; // nothing was lost: nothing to tell
      await expect(
        app.page.getByText(/not (been )?saved|unsaved|may (have been )?(be )?lost|could not save|recover/i).first(),
        'the teacher is told the last writing was not saved'
      ).toBeVisible({ timeout: 20000 });
    }
  );
});
