// WB-08 — Long teaching session (handwriting, panning, autosave)
// Source: CEPV2_Stories/06_Whiteboard.md
//
// Writing is human-like (pages/lib/handwriting.js): one joined-up pen stroke per word plus the dots and crosses, lines
// that slope a little, and a pan to fresh board space whenever the visible area is full. Data: 'toolbarGeneral'
// (Class 12A Physics, 1.1). The board is cleared before each test (cleanBoard) and again at the end, so the ~1,500
// strokes of the long session do not slow down every later test that opens this topic.
// WB-08-04 (closing the app mid-countdown) needs its own client launch: wb-08-04-close-app.spec.js.

const { test, expect } = require('../../fixtures');
const { layoutHandwriting, lessonText } = require('../../pages/lib/handwriting');

const strokeCount = (pages) => pages.reduce((n, p) => n + p.words.reduce((m, w) => m + w.strokes.length, 0), 0);
const avg = (xs) => Math.round(xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length));

/** Wait until a "Whiteboard Saved!" message appears after `since` (ms timestamp); returns it or null. */
const waitForSaveAfter = async (user, since, timeout = 60000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const saved = (await user.content.savedMessages()).filter((m) => m.at > since && /saved/i.test(m.text));
    if (saved.length) return saved[saved.length - 1];
    await user.page.waitForTimeout(1000);
  }
  return null;
};

const reloadAndCount = async (user, expected) => {
  const t0 = Date.now();
  await user.page.reload();
  await user.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
  await user.toolbar.wbSvg.waitFor({ state: 'visible', timeout: 20000 });
  await expect.poll(() => user.toolbar.pathCount(), { timeout: 60000 }).toBeGreaterThanOrEqual(expected);
  return Date.now() - t0;
};

test.describe('WB-08 Long teaching session', () => {
  test.use({ classMap: 'toolbarGeneral', cleanBoard: true });

  test.afterEach(async ({ app }) => {
    await app.page.unroute('**/*').catch(() => {});
    await app.toolbar.clearBoard(app.whiteboard).catch(() => {});
  });

  test(
    'WB-08-01: a teacher handwrites about 800 words with panning; autosave keeps up and every stroke survives a reload (with WB-08-02 speed and WB-08-06 topic switch)',
    { tag: ['@long', '@regression', '@performance'] },
    async ({ user }) => {
      // CONFIRMED LIVE (2026-09-27): 800 words + 4 pans + the reload/topic-switch checks took just over 60 minutes with
      // correct (non-garbled) point-by-point input; a 60-minute cap force-closes the page mid-cleanup. 100 minutes.
      test.setTimeout(100 * 60 * 1000);
      const area = await user.content.writingArea();
      const pages = layoutHandwriting(lessonText(800), area);
      const expected = strokeCount(pages);
      const words = pages.reduce((n, p) => n + p.words.length, 0);
      await user.content.startSaveLog();

      const started = Date.now();
      const timings = await user.content.writeHandwriting(pages, {
        nextPage: () => user.content.panUp(area.height + 40),
        step: 6,
      });
      const finished = Date.now();
      const geometry = await user.content.pathGeometry();
      const onBoard = geometry.length;

      const finalSave = await waitForSaveAfter(user, finished);
      const log = await user.content.savedMessages();
      const saves = log.filter((m) => /saved/i.test(m.text) && m.at <= finished);
      let longestGap = 0;
      let prev = started;
      for (const s of [...saves, { at: finished }]) {
        longestGap = Math.max(longestGap, s.at - prev);
        prev = s.at;
      }
      const first100 = avg(timings.slice(0, 100).map((t) => t.ms));
      const last100 = avg(timings.slice(-100).map((t) => t.ms));
      test.info().annotations.push({
        type: 'note',
        description:
          `${words} words, ${expected} strokes written in ${Math.round((finished - started) / 1000)} s over ${pages.length} ` +
          `pages; ${onBoard} strokes on the board; ${saves.length} "Whiteboard Saved!" messages while writing, longest ` +
          `gap without a save ${Math.round(longestGap / 1000)} s; final message: "${finalSave ? finalSave.text : 'none'}"; ` +
          `ms per word: first 100 = ${first100}, last 100 = ${last100}.`,
      });

      expect(onBoard, 'every stroke landed on the board').toBe(expected);
      expect(finalSave, 'a "Whiteboard Saved!" message follows the last word').not.toBeNull();
      expect.soft(saves.length, 'autosave ran during the session, not only at the end').toBeGreaterThan(0);
      expect.soft(longestGap, 'never more than 2 minutes of writing without a save').toBeLessThanOrEqual(120000);
      // WB-08-02: the board does not bog down as it fills up.
      expect
        .soft(last100, 'WB-08-02: the last 100 words are not much slower than the first 100')
        .toBeLessThanOrEqual(first100 * 2);

      const reloadMs = await reloadAndCount(user, expected);
      test.info().annotations.push({ type: 'note', description: `Reload showed all strokes after ${reloadMs} ms.` });
      expect(
        await user.content.pathGeometry(),
        'after a reload every stroke is back with exactly the same shape'
      ).toEqual(geometry);
      expect.soft(reloadMs, 'the full board is back within 20 s of a reload').toBeLessThanOrEqual(20000);

      // WB-08-06: away to another topic and back -- the whole board comes back, not a partial load.
      await user.nav.goToChapterTopic(0, 1);
      await user.toolbar.waitForBoardToSettle();
      await user.nav.goToChapterTopic(0, 0);
      await expect
        .poll(() => user.toolbar.pathCount(), {
          message: 'WB-08-06: the full board is back after a topic switch',
          timeout: 60000,
        })
        .toBe(expected);
    }
  );

  test(
    'WB-08-03: writing continues while the network is down; once it is back everything written offline is saved',
    { tag: ['@negative', '@regression'] },
    async ({ user, page }) => {
      test.setTimeout(15 * 60 * 1000);
      const area = await user.content.writingArea();
      const [part1, part2] = [
        layoutHandwriting(lessonText(30), area, { seed: 3 }),
        layoutHandwriting(
          lessonText(30),
          { ...area, y: area.y + area.height / 2, height: area.height / 2 },
          { seed: 5 }
        ),
      ];
      await user.content.startSaveLog();
      await user.content.writeHandwriting(part1);
      const firstSave = await waitForSaveAfter(user, Date.now() - 1000);
      expect(firstSave, 'the first part saves normally').not.toBeNull();

      // Network down (context.setOffline is a no-op in the desktop client, see HDR-07-04): every request fails.
      await page.route('**/*', (route) => route.abort('internetdisconnected'));
      const offlineAt = Date.now();
      await user.content.writeHandwriting(part2);
      await page.waitForTimeout(20000); // longer than the autosave countdown
      const expected = strokeCount(part1) + strokeCount(part2);
      expect(await user.toolbar.pathCount(), 'everything written offline is on the board').toBe(expected);
      const warned = await page
        .getByText(/offline|no (internet|network|connection)|not saved|unable to save|save failed|retry/i)
        .first()
        .isVisible()
        .catch(() => false);
      const offlineMessages = (await user.content.savedMessages()).filter((m) => m.at > offlineAt).map((m) => m.text);
      test.info().annotations.push({
        type: 'note',
        description: `While offline: warning shown = ${warned}; autosave messages = ${JSON.stringify(offlineMessages)}`,
      });
      expect
        .soft(
          offlineMessages.some((t) => /saved/i.test(t)),
          'the app does not claim "Whiteboard Saved!" while nothing can reach the server'
        )
        .toBe(false);

      await page.unroute('**/*');
      const backOnline = Date.now();
      // Draw one more short stroke so the app has a reason to save again, as a teacher who keeps writing would.
      await user.content.writeHandwriting(
        layoutHandwriting('done', { ...area, y: area.y + area.height - 60 }, { seed: 9 })
      );
      const saved = await waitForSaveAfter(user, backOnline, 60000);
      // Soft: when autosave never resumes, the reload below shows what that costs the teacher.
      expect.soft(saved, 'autosave resumes once the network is back').not.toBeNull();
      const onScreen = await user.content.pathGeometry();
      await user.page.waitForTimeout(15000);
      await user.page.reload();
      await user.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
      await user.page.waitForTimeout(5000);
      await user.toolbar.waitForBoardToSettle();
      const after = await user.content.pathGeometry();
      test.info().annotations.push({
        type: 'note',
        description: `On screen before reload: ${onScreen.length}; after reload: ${after.length}`,
      });
      expect(
        onScreen.filter((d) => !after.includes(d)),
        'nothing written offline (or after) is lost after a reload'
      ).toHaveLength(0);
    }
  );

  test(
    'WB-08-05: Undo after a long passage removes only the last stroke, and Redo puts it back',
    { tag: ['@edge'] },
    async ({ user }) => {
      test.setTimeout(10 * 60 * 1000);
      const area = await user.content.writingArea();
      await user.content.writeHandwriting(layoutHandwriting(lessonText(60), area, { seed: 11 }));
      const before = await user.content.pathGeometry();

      await user.toolbar.tool('gtUndo').click({ force: true });
      await expect.poll(() => user.toolbar.pathCount(), { timeout: 10000 }).toBe(before.length - 1);
      expect(await user.content.pathGeometry(), 'only the very last stroke went').toEqual(before.slice(0, -1));

      await user.toolbar.tool('gtRedo').click({ force: true });
      await expect.poll(() => user.toolbar.pathCount(), { timeout: 10000 }).toBe(before.length);
      expect(await user.content.pathGeometry(), 'Redo puts back the same stroke').toEqual(before);
    }
  );
});
