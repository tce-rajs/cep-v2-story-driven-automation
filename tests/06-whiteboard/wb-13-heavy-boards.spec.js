// WB-13 — Heavy boards
// Source: CEPV2_Stories/06_Whiteboard.md
//
// Data: 12A Physics 1.7 (~8,400 strokes, from the long writing runs on the Ultra server), on the primary account.
// Read-only: these boards are never written on. The desktop client crashes ("Target crashed") on a board of about
// 8,400+ strokes and then crashes again at every sign-in, because it reopens the last topic (WB-13-01/02, CLIENT-01).
// So these run in the browser only (RUN_IN_BROWSER=1), and every test leaves the account on a light topic (1.1)
// so the heavy board is never the last-opened topic.
// WB-13-04 (writing stays smooth on a heavy board) writes on the scratch board (9A Science 8.2) instead: it grows it
// to 10,000 strokes and leaves it empty again (tests/18-resilience/resilience-lib.js).

const { test, expect } = require('../../fixtures');
const { growBoard, openScratchBoard, emptyScratch, waitForSave } = require('../18-resilience/resilience-lib');

const HEAVY = { grade: 'Class 12', division: 'A', subject: 'Physics', chapter: 0, topic: 6, label: '1.7' };
const LIGHT = { chapter: 0, topic: 0 };
const OPEN_SECONDS = Number(process.env.HEAVY_BOARD_OPEN_SECONDS || 30);

/** Open the heavy board; returns how long it took until its stroke count stopped growing, and that count. */
const openHeavy = async (user) => {
  const t0 = Date.now();
  await user.nav.resetToClass(HEAVY.grade, HEAVY.division, HEAVY.subject);
  await user.nav.goToChapterTopic(HEAVY.chapter, HEAVY.topic);
  await expect(user.nav.currentChapterTopicBtn, `on the heavy board (${HEAVY.label})`).toHaveText(
    new RegExp(`^\\s*${HEAVY.label.replace('.', '\\.')}\\s`),
    { timeout: 30000 }
  );
  await expect
    .poll(() => user.toolbar.allPaths.count(), { message: 'the heavy board loads', timeout: 180000 })
    .toBeGreaterThan(5000);
  await user.toolbar.waitForBoardToSettle(20);
  return { seconds: Math.round((Date.now() - t0) / 100) / 10, strokes: await user.toolbar.allPaths.count() };
};

const allOutlines = (user) => user.toolbar.allPaths.evaluateAll((els) => els.map((e) => e.getAttribute('d')));

test.describe('WB-13 Heavy boards', () => {
  test.describe.configure({ timeout: 10 * 60 * 1000 });
  test.skip(
    !process.env.RUN_IN_BROWSER,
    'browser only: the desktop client crashes on boards of 8,400+ strokes (WB-13-01) and then reopens the board at every sign-in'
  );

  test.afterEach(async ({ app }) => {
    // Never leave the heavy board as the last-opened topic.
    await app.nav.goToChapterTopic(LIGHT.chapter, LIGHT.topic).catch(() => {});
  });

  test(
    'WB-13-03: a board of about 10,000 strokes opens within an agreed time',
    { tag: ['@performance'] },
    async ({ user }) => {
      const { seconds, strokes } = await openHeavy(user);
      test.info().annotations.push({
        type: 'note',
        description: `Heavy board ${HEAVY.label}: ${strokes} strokes, opened in ${seconds} s (limit ${OPEN_SECONDS} s)`,
      });
      expect(seconds, `opens within ${OPEN_SECONDS} s`).toBeLessThanOrEqual(OPEN_SECONDS);
    }
  );

  test(
    'WB-13-05: switching from a heavy board to another topic and back works, and the heavy board is complete',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openHeavy(user);
      const before = await allOutlines(user);
      await user.nav.goToChapterTopic(LIGHT.chapter, LIGHT.topic);
      await expect(user.nav.currentChapterTopicBtn, 'switched to another topic').toHaveText(/^\s*1\.1\s/, {
        timeout: 30000,
      });
      await user.nav.goToChapterTopic(HEAVY.chapter, HEAVY.topic);
      await expect
        .poll(async () => (await allOutlines(user)).length, { message: 'every stroke is back', timeout: 180000 })
        .toBeGreaterThanOrEqual(before.length);
      const after = new Set(await allOutlines(user));
      const missing = before.filter((d) => !after.has(d));
      expect(missing, `the heavy board is complete (${before.length} strokes)`).toHaveLength(0);
      expect(after.size, 'and nothing was added').toBeLessThanOrEqual(new Set(before).size);
    }
  );

  test(
    'WB-13-06: Whiteboard History and the Minimap open on a heavy board',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openHeavy(user);
      await user.userMenu.openProfileMenu();
      await user.userMenu.wbHistoryBtn.click({ force: true });
      await expect(user.userMenu.wbHistoryPanel, 'Whiteboard History opens').toBeVisible({ timeout: 30000 });
      expect((await user.userMenu.wbHistoryRows()).length, 'and lists the saved versions').toBeGreaterThan(0);
      await user.userMenu.wbHistoryPanel.getByText('✕', { exact: true }).first().click({ force: true });
      await expect(user.userMenu.wbHistoryPanel).toBeHidden({ timeout: 10000 });
      await user.minimap.open(user.toolbar);
      try {
        expect(await user.minimap.isShown(), 'the Minimap opens').toBe(true);
        expect((await user.minimap.readCanvas()).content, 'and shows the writing').toBeGreaterThan(0);
      } finally {
        await user.minimap.close().catch(() => {});
      }
    }
  );

  test(
    'WB-13-04: writing, zoom and pan stay smooth on a heavy board',
    { tag: ['@performance', '@long'] },
    async ({ app }) => {
      const LIMIT_MS = Number(process.env.HEAVY_BOARD_STEP_MS || 2000);
      const times = {};
      try {
        await openScratchBoard(app);
        await growBoard(app, 10000);
        await waitForSave(app, 120000);
        const tb = app.toolbar;
        // Writing: a stroke appears on the board.
        const before = await tb.allPaths.count();
        let t0 = Date.now();
        await tb.selectTool('gtPen');
        await tb.drawStroke({ x: 500, y: 300 }, { x: 800, y: 340 }, 10);
        await expect.poll(() => tb.allPaths.count(), { message: 'the stroke appears' }).toBe(before + 1);
        times.write = Date.now() - t0 - 700; // drawStroke's own settle wait
        // Zoom: one step in takes effect.
        await tb.openToolPanel('gtZoom');
        const zoom = await app.content.zoomPercent();
        t0 = Date.now();
        await tb.zoomInBtn.click({ force: true });
        await expect.poll(() => app.content.zoomPercent(), { message: 'the zoom changes' }).not.toBe(zoom);
        times.zoom = Date.now() - t0;
        await tb.zoomResetBtn.click({ force: true }).catch(() => {});
        await tb.closePanelByTappingOutside();
        // Pan: the board moves under the Pan tool.
        const view = async () =>
          `${await app.whiteboard.innerPanGroupTransform()}|${await app.whiteboard.outerTransform()}`;
        const viewBefore = await view();
        t0 = Date.now();
        await app.content.panUp(200);
        await expect.poll(view, { message: 'the board pans' }).not.toBe(viewBefore);
        times.pan = Date.now() - t0 - 500; // panUp's own settle wait
      } finally {
        test.info().annotations.push({
          type: 'note',
          description: `On a 10,000-stroke board (ms): ${JSON.stringify(times)}`,
        });
        await emptyScratch(app).catch(() => {});
      }
      for (const [step, ms] of Object.entries(times))
        expect.soft(ms, `${step} responds within ${LIMIT_MS} ms`).toBeLessThan(LIMIT_MS);
    }
  );
});
