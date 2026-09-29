// WB-08-04 — closing the app straight after writing, before the autosave countdown ends
// Source: CEPV2_Stories/06_Whiteboard.md
//
// Needs raw control over closing and relaunching a whole separate client (like LOG-01-14), so it uses Playwright's own
// `test` and launchWithRetry() instead of this suite's fixtures. Data: 'toolbarGeneral' (Class 12A Physics, 1.1),
// never cleared (owner rule 2026-09-29): the test writes on fresh space below the teacher's writing and compares only
// its own strokes, in the reopened client too.

const { test, expect } = require('@playwright/test');
const { launchWithRetry } = require('../../fixtures/electron-app');
const { App } = require('../../pages/app');
const { layoutHandwriting, lessonText } = require('../../pages/lib/handwriting');

const openSignedIn = async () => {
  const client = await launchWithRetry();
  const app = new App(client.teachWindow);
  await app.signIn(process.env.VALID_PIN);
  await app.nav.applyClassMap('toolbarGeneral');
  await app.toolbar.waitForBoardToSettle();
  return { client, app };
};

test(
  'WB-08-04: closing the app straight after the last word, before the autosave countdown ends, loses nothing',
  { tag: ['@negative', '@regression'] },
  async () => {
    test.skip(!!process.env.RUN_IN_BROWSER, 'closing the desktop client has no browser-mode equivalent');
    test.setTimeout(10 * 60 * 1000);
    // Known product bug (found 2026-09-27 on QA, video in test-evidence/; reproduced on 172.18.2.85 on 2026-09-29,
    // closed during "Saving whiteboard ... in 10s"): the pending save is dropped when the app closes.
    test.fail(true, 'Closing the app during the autosave countdown loses everything written since the last save');

    let written;
    let existing;
    const first = await openSignedIn();
    try {
      await first.app.content.startOnFreshSpace();
      existing = first.app.page.__autotestExisting; // the teacher's content, to leave out of the counts after reopening
      const area = await first.app.content.writingArea();
      await first.app.content.writeHandwriting(layoutHandwriting(lessonText(40), area, { seed: 21 }));
      written = await first.app.content.pathGeometry();
      // No wait for "Whiteboard Saved!": the teacher closes the app right away, as at the end of a period.
      const countdown = await first.app.page
        .getByText(/saving whiteboard/i)
        .first()
        .innerText()
        .catch(() => 'none');
      test.info().annotations.push({ type: 'note', description: `Closed during: "${countdown}"` });
    } finally {
      await first.client.app.close().catch(() => {});
    }

    const second = await openSignedIn();
    second.app.page.__autotestExisting = existing;
    try {
      await expect
        .poll(() => second.app.toolbar.pathCount(), {
          message: 'the strokes written just before closing are there after reopening',
          timeout: 30000,
        })
        .toBe(written.length);
      expect(await second.app.content.pathGeometry(), 'with exactly the same shapes').toEqual(written);
    } finally {
      await second.client.app.close().catch(() => {});
    }
  }
);
