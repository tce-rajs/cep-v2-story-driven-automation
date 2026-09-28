// WB-08 — Long teaching session (handwriting, panning, autosave)
// Source: CEPV2_Stories/06_Whiteboard.md
//
// Writing is human-like (pages/lib/handwriting.js): one joined-up pen stroke per word plus the dots and crosses, lines
// that slope a little, and a pan to fresh board space whenever the visible area is full. Data: 'toolbarGeneral'
// (Class 12A Physics, 1.1). The board is cleared before and after each test (the long session's three tests share one
// board, see below), so the ~1,500 strokes of the long session do not slow down every later test that opens this topic.
// WB-08-04 (closing the app mid-countdown) needs its own client launch: wb-08-04-close-app.spec.js.

const fs = require('fs');
const path = require('path');
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

// --- WB-08-01, WB-08-02 and WB-08-06: three stories, one ~60-minute handwriting session ---
//
// Writing 800 words takes about an hour, so it is done once, by WB-08-01. WB-08-02 (speed) and WB-08-06 (topic switch)
// are their own tests with their own result, and use that session instead of writing it again. WB-08-01 saves what they
// need (per-word timings, the stroke count) to a file in this run's output folder. Playwright empties that folder at the
// start of every run, so the file always comes from this run. They cannot share it in memory: after a failed test
// Playwright starts a fresh worker. Run on their own (without WB-08-01), WB-08-02 and WB-08-06 skip with that reason.
//
// The board is cleared when WB-08-01 starts and at the end of WB-08-06. If WB-08-01 fails before the session is
// saved, WB-08-01 clears it itself. Running WB-08-01 on its own leaves the 800 words on 1.1 until the next cleanBoard
// test.
const sessionFile = () => path.join(test.info().project.outputDir, 'wb-08-long-session.json');
const readSession = () => {
  try {
    return JSON.parse(fs.readFileSync(sessionFile(), 'utf8'));
  } catch {
    return null;
  }
};
const needSession = () => {
  const session = readSession();
  test.skip(!session, 'needs the 800-word session that WB-08-01 writes earlier in the same run (run the whole file)');
  return session;
};

test.describe('WB-08 Long teaching session: one 800-word session', () => {
  test.use({ classMap: 'toolbarGeneral' });

  test(
    'WB-08-01: a teacher handwrites about 800 words with panning; autosave keeps up and every stroke survives a reload',
    { tag: ['@long', '@regression', '@performance'] },
    async ({ user }) => {
      // CONFIRMED LIVE (2026-09-27): 800 words + 4 pans + the reload took just under 60 minutes with correct
      // (non-garbled) point-by-point input; a 60-minute cap force-closes the page mid-cleanup. 100 minutes.
      test.setTimeout(100 * 60 * 1000);
      fs.rmSync(sessionFile(), { force: true });
      await user.toolbar.clearBoard(user.whiteboard);
      const area = await user.content.writingArea();
      const pages = layoutHandwriting(lessonText(800), area);
      const expected = strokeCount(pages);
      const words = pages.reduce((n, p) => n + p.words.length, 0);
      await user.content.startSaveLog();

      let timings;
      let started;
      let finished;
      try {
        started = Date.now();
        timings = await user.content.writeHandwriting(pages, {
          nextPage: () => user.content.panUp(area.height + 40),
          step: 6,
        });
        finished = Date.now();
      } catch (err) {
        // The session never finished: nothing for WB-08-02/06 to use, so do not leave a half-written board behind.
        await user.toolbar.clearBoard(user.whiteboard).catch(() => {});
        throw err;
      }
      const geometry = await user.content.pathGeometry();
      const onBoard = geometry.length;
      fs.mkdirSync(path.dirname(sessionFile()), { recursive: true });
      fs.writeFileSync(sessionFile(), JSON.stringify({ words, expected, onBoard, ms: timings.map((t) => t.ms) }));

      const finalSave = await waitForSaveAfter(user, finished);
      const log = await user.content.savedMessages();
      const saves = log.filter((m) => /saved/i.test(m.text) && m.at <= finished);
      let longestGap = 0;
      let prev = started;
      for (const s of [...saves, { at: finished }]) {
        longestGap = Math.max(longestGap, s.at - prev);
        prev = s.at;
      }
      test.info().annotations.push({
        type: 'note',
        description:
          `${words} words, ${expected} strokes written in ${Math.round((finished - started) / 1000)} s over ${pages.length} ` +
          `pages; ${onBoard} strokes on the board; ${saves.length} "Whiteboard Saved!" messages while writing, longest ` +
          `gap without a save ${Math.round(longestGap / 1000)} s; final message: "${finalSave ? finalSave.text : 'none'}".`,
      });

      expect.soft(onBoard, 'every stroke landed on the board').toBe(expected);
      expect.soft(finalSave, 'a "Whiteboard Saved!" message follows the last word').not.toBeNull();
      expect.soft(saves.length, 'autosave ran during the session, not only at the end').toBeGreaterThan(0);
      expect.soft(longestGap, 'never more than 2 minutes of writing without a save').toBeLessThanOrEqual(120000);

      const reloadMs = await reloadAndCount(user, expected);
      test.info().annotations.push({ type: 'note', description: `Reload showed all strokes after ${reloadMs} ms.` });
      expect(
        await user.content.pathGeometry(),
        'after a reload every stroke is back with exactly the same shape'
      ).toEqual(geometry);
      expect.soft(reloadMs, 'the full board is back within 20 s of a reload').toBeLessThanOrEqual(20000);
    }
  );

  test(
    'WB-08-02: the last 100 words of the long session are not much slower to write than the first 100',
    { tag: ['@long', '@performance'] },
    async () => {
      const session = needSession();
      const first100 = avg(session.ms.slice(0, 100));
      const last100 = avg(session.ms.slice(-100));
      test.info().annotations.push({
        type: 'note',
        description: `${session.words} words; ms per word: first 100 = ${first100}, last 100 = ${last100}.`,
      });
      expect(last100, 'the board does not bog down as it fills up').toBeLessThanOrEqual(first100 * 2);
    }
  );

  test(
    'WB-08-06: after the long session, switching to another topic and back brings back the full board',
    { tag: ['@long', '@edge'] },
    async ({ user }) => {
      test.setTimeout(10 * 60 * 1000);
      const session = needSession();
      try {
        // Start from the board as it is now, fully loaded: whether the reload kept every stroke is WB-08-01's check.
        await expect
          .poll(() => user.toolbar.pathCount(), { message: 'the long session is on the board', timeout: 60000 })
          .toBeGreaterThanOrEqual(Math.min(session.onBoard, session.expected));
        await user.toolbar.waitForBoardToSettle();
        const before = await user.content.pathGeometry();

        await user.nav.goToChapterTopic(0, 1);
        await user.toolbar.waitForBoardToSettle();
        await user.nav.goToChapterTopic(0, 0);
        await expect
          .poll(() => user.toolbar.pathCount(), {
            message: 'the full board is back after a topic switch, not a partial load',
            timeout: 60000,
          })
          .toBe(before.length);
        expect(await user.content.pathGeometry(), 'every stroke back with exactly the same shape').toEqual(before);
      } finally {
        await user.toolbar.clearBoard(user.whiteboard).catch(() => {});
        fs.rmSync(sessionFile(), { force: true });
      }
    }
  );
});

test.describe('WB-08 Long teaching session', () => {
  test.use({ classMap: 'toolbarGeneral', cleanBoard: true });

  test.afterEach(async ({ app }) => {
    await app.page.unroute('**/*').catch(() => {});
    await app.toolbar.clearBoard(app.whiteboard).catch(() => {});
  });

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

      // One story with four separate outcomes; each phase is a step and each outcome a soft check, so the report shows
      // every outcome instead of stopping at the first one that fails.
      await test.step('online: the first part saves normally', async () => {
        await user.content.startSaveLog();
        await user.content.writeHandwriting(part1);
        const firstSave = await waitForSaveAfter(user, Date.now() - 1000);
        // Hard: if saving does not work even online, the offline checks below mean nothing.
        expect(firstSave, 'the first part saves normally').not.toBeNull();
      });

      await test.step('offline: writing is kept on the board and not reported as saved', async () => {
        // Network down (context.setOffline is a no-op in the desktop client, see HDR-07-04): every request fails.
        await page.route('**/*', (route) => route.abort('internetdisconnected'));
        const offlineAt = Date.now();
        await user.content.writeHandwriting(part2);
        await page.waitForTimeout(20000); // longer than the autosave countdown
        const expected = strokeCount(part1) + strokeCount(part2);
        expect.soft(await user.toolbar.pathCount(), 'everything written offline is on the board').toBe(expected);
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
      });

      await test.step('back online: autosave resumes', async () => {
        await page.unroute('**/*');
        const backOnline = Date.now();
        // Draw one more short stroke so the app has a reason to save again, as a teacher who keeps writing would.
        await user.content.writeHandwriting(
          layoutHandwriting('done', { ...area, y: area.y + area.height - 60 }, { seed: 9 })
        );
        const saved = await waitForSaveAfter(user, backOnline, 60000);
        // Soft: when autosave never resumes, the reload below shows what that costs the teacher.
        expect.soft(saved, 'autosave resumes once the network is back').not.toBeNull();
      });

      await test.step('after a reload: nothing written offline (or after) is lost', async () => {
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
      });
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
