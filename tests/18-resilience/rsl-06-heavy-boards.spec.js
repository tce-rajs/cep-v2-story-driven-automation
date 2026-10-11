// RSL-06 — Heavy boards keep working
// Source: CEPV2_Stories/18_Resilience.md
// Browser only (RUN_IN_BROWSER=1), like WB-13: the desktop client crashes ("Target crashed") on boards of about
// 8,400+ strokes and then reopens the board at every sign-in (RSL-06-01/02, improvements).
// RSL-06-03 opens two heavy boards of 12A Physics (read only, never written on) and leaves the account on 1.1.
// RSL-06-04..07 grow the scratch board (9A Science 8.2) to the size they need and leave it empty again.
// RSL-06-08 (one long stroke) runs in the client too, on fresh space of 'toolbarGeneral'.

const { test, expect } = require('../../fixtures');
const { GUEST_WIDGETS } = require('../../pages/without-login.page');
const { widgetsOnBoard, closeWidgets } = require('../00-flows/flow-helpers');
const {
  BOARD,
  allStrokes,
  compareBoard,
  waitForSave,
  growBoard,
  openScratchBoard,
  emptyScratch,
} = require('./resilience-lib');

const browserOnly = () =>
  test.skip(
    !process.env.RUN_IN_BROWSER,
    'browser only: the desktop client crashes on boards of 8,400+ strokes (RSL-06-01) and then reopens the board at every sign-in'
  );

/** Reload and time until the board shows at least `count` strokes (and stops growing). Returns seconds. */
async function timedReload(app, count) {
  const t0 = Date.now();
  await app.page.reload();
  await app.login.avatar.waitFor({ state: 'visible', timeout: 60000 });
  await expect
    .poll(() => app.toolbar.allPaths.count(), { message: `the ${count}-stroke board opens`, timeout: 300000 })
    .toBeGreaterThanOrEqual(count);
  await app.toolbar.waitForBoardToSettle(20);
  return Math.round((Date.now() - t0) / 100) / 10;
}

/** The scratch board grown to `count` strokes and saved. */
async function heavyScratch(app, count) {
  await openScratchBoard(app);
  await growBoard(app, count);
  await waitForSave(app, 120000);
}

test.describe('RSL-06 Heavy boards keep working', () => {
  test.describe.configure({ timeout: 90 * 60 * 1000 });

  test.describe('heavy boards', () => {
    browserOnly();

    test(
      'RSL-06-03: opening two heavy boards one after another in the browser does not crash the tab',
      { tag: ['@performance'] },
      async ({ user, page }) => {
        // 12A Physics 1.7 and 1.6: the boards of the long writing runs (read only).
        const crashed = [];
        page.on('crash', () => crashed.push(Date.now()));
        try {
          await user.nav.resetToClass('Class 12', 'A', 'Physics');
          for (const topic of [6, 5]) {
            await user.nav.goToChapterTopic(0, topic);
            await expect(user.nav.currentChapterTopicBtn).toHaveText(new RegExp(`^\\s*1\\.${topic + 1}\\s`), {
              timeout: 30000,
            });
            const loaded = await expect
              .poll(() => user.toolbar.allPaths.count(), { timeout: 180000 })
              .toBeGreaterThan(5000)
              .then(() => true)
              .catch(() => false);
            if (!loaded && !crashed.length)
              throw new Error(
                `DATA MISSING ON THIS SERVER: 12A Physics 1.${topic + 1} is not a heavy board (5,000+ strokes)`
              );
          }
          expect(crashed, 'the tab did not crash').toEqual([]);
          await expect(user.toolbar.wbSvg, 'and the board is still there').toBeVisible();
        } finally {
          await user.nav.goToChapterTopic(0, 0).catch(() => {});
        }
      }
    );

    test(
      'RSL-06-04: a board grown to 20,000 strokes still opens, and its open time is recorded',
      { tag: ['@performance', '@long'] },
      async ({ app }) => {
        const times = {};
        try {
          await openScratchBoard(app);
          for (const size of [1000, 5000, 10000, 20000]) {
            await growBoard(app, size);
            await waitForSave(app, 180000);
            times[size] = await timedReload(app, size);
          }
        } finally {
          test
            .info()
            .annotations.push({ type: 'note', description: `Open time (s) by size: ${JSON.stringify(times)}` });
          await emptyScratch(app).catch(() => {});
        }
        expect(times[20000], 'the 20,000-stroke board opens').toBeGreaterThan(0);
      }
    );

    test(
      'RSL-06-05: on a 10,000-stroke board, a new line of writing is saved within one autosave countdown',
      { tag: ['@performance', '@long'] },
      async ({ app }) => {
        try {
          await heavyScratch(app, 10000);
          await app.content.startSaveLog();
          const since = Date.now();
          await app.toolbar.penStroke({ x: 500, y: 300 }, { x: 900, y: 320 });
          await expect
            .poll(async () => (await app.content.savedMessages()).some((m) => m.at >= since && /saved/i.test(m.text)), {
              message: '"Whiteboard Saved!" for the new line',
              timeout: 90000,
            })
            .toBe(true);
          const log = (await app.content.savedMessages()).filter((m) => m.at >= since);
          const countdown = Number(
            ((log.find((m) => /saving/i.test(m.text)) || {}).text || '').match(/(\d+)\s*s/)?.[1]
          );
          const savedAfter = (log.find((m) => /saved/i.test(m.text)).at - since) / 1000;
          test.info().annotations.push({
            type: 'note',
            description: `Countdown shown: ${countdown || '?'} s; saved ${savedAfter.toFixed(1)} s after the line.`,
          });
          expect(savedAfter, 'saved within one countdown (plus a few seconds)').toBeLessThanOrEqual(
            (countdown || 10) + 5
          );
        } finally {
          await emptyScratch(app).catch(() => {});
        }
      }
    );

    test(
      'RSL-06-06: writing while zoomed out to 25% on a heavy board saves the strokes in the right place and size',
      { tag: ['@performance', '@long'] },
      async ({ app }) => {
        try {
          await heavyScratch(app, 10000);
          const tb = app.toolbar;
          await tb.openToolPanel('gtZoom');
          for (let i = 0; i < 10 && (await app.content.zoomPercent()) !== 25; i++)
            await tb.zoomOutBtn.click({ force: true });
          await tb.closePanelByTappingOutside();
          expect(await app.content.zoomPercent(), 'set-up: zoomed out to 25%').toBe(25);
          const before = new Set(await allStrokes(app));
          await tb.penStroke({ x: 500, y: 400 }, { x: 700, y: 400 }); // 200 px on screen = 800 board px at 25%
          const d = (await allStrokes(app)).find((x) => !before.has(x));
          const bbox = (dd) =>
            tb.allPaths.evaluateAll((els, want) => {
              const p = els.find((e) => e.getAttribute('d') === want);
              if (!p) return null;
              const b = p.getBBox();
              return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width) };
            }, dd);
          const drawn = await bbox(d);
          await waitForSave(app, 90000);
          await timedReload(app, 10000);
          const saved = await bbox(d);
          test.info().annotations.push({
            type: 'note',
            description: `Drawn ${JSON.stringify(drawn)}, saved ${JSON.stringify(saved)}`,
          });
          expect(saved, 'the stroke is saved in the same place and size').toEqual(drawn);
          expect(Math.abs(drawn.width - 800), 'drawn at the board size the zoom implies (about 800 px)').toBeLessThan(
            80
          );
        } finally {
          await emptyScratch(app).catch(() => {});
        }
      }
    );

    test(
      'RSL-06-07: ten widgets on a 10,000-stroke board stay usable',
      { tag: ['@performance', '@long'] },
      async ({ app }) => {
        try {
          await heavyScratch(app, 10000);
          const names = [...GUEST_WIDGETS, ...GUEST_WIDGETS].slice(0, 10);
          for (const name of names) {
            await app.toolbar.openToolPanel('gtWidgets');
            await app.toolbar.widgetTool(name).click({ force: true });
            await app.toolbar.closePanelByTappingOutside();
          }
          await expect
            .poll(() => widgetsOnBoard(app.page), { message: 'ten widgets on the board', timeout: 20000 })
            .toBeGreaterThanOrEqual(10);
          // Usable: the pen still writes promptly with all ten open.
          const t0 = Date.now();
          const before = await app.toolbar.allPaths.count();
          await app.toolbar.penStroke({ x: 300, y: 600 }, { x: 500, y: 640 });
          const ms = Date.now() - t0;
          test.info().annotations.push({ type: 'note', description: `A stroke with ten widgets open took ${ms} ms.` });
          expect(await app.toolbar.allPaths.count(), 'the pen writes').toBe(before + 1);
          expect(ms, 'promptly').toBeLessThan(5000);
        } finally {
          await closeWidgets(app).catch(() => {});
          await emptyScratch(app).catch(() => {});
        }
      }
    );
  });

  test.describe('one long stroke', () => {
    test.use({ classMap: BOARD, freshSpace: true });

    test(
      'RSL-06-08: one pen stroke held down for 60 s (a long diagram line) is saved as one complete stroke',
      { tag: ['@edge'] },
      async ({ user, page }) => {
        test.setTimeout(5 * 60 * 1000);
        await user.toolbar.selectTool('gtPen');
        const before = new Set(await allStrokes(user));
        const box = await user.toolbar.wbSvg.boundingBox();
        // A slow spiral-like line across the page: 600 moves, 100 ms apart.
        await page.mouse.move(box.x + 300, box.y + 300);
        await page.mouse.down();
        for (let i = 1; i <= 600; i++) {
          const t = i / 600;
          await page.mouse.move(box.x + 300 + 900 * t, box.y + 300 + 120 * Math.sin(t * 12));
          await page.waitForTimeout(100);
        }
        await page.mouse.up();
        await page.waitForTimeout(1000);
        const added = (await allStrokes(user)).filter((d) => !before.has(d));
        expect(added.length, 'one stroke on the board').toBe(1);
        await waitForSave(user, 60000);
        await page.reload();
        await user.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
        await user.toolbar.waitForBoardToSettle();
        const { missing } = await compareBoard(user, added);
        expect(missing, 'saved as the same one complete stroke').toBe(0);
      }
    );
  });
});
