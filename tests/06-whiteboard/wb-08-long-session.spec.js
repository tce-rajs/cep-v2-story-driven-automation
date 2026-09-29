// WB-08 — Long teaching session (handwriting, panning, autosave)
// Source: CEPV2_Stories/06_Whiteboard.md
//
// Writing is human-like (pages/lib/handwriting.js): one joined-up pen stroke per word plus the dots and crosses, lines
// that slope a little, and a pan to fresh board space whenever the visible area is full. Data: 'toolbarGeneral'
// (Class 12A Physics, 1.1), cleared before and after, so the ~1,500 strokes of the long session do not slow down every
// later test that opens this topic.
// WB-08-04 (closing the app mid-countdown) needs its own client launch: wb-08-04-close-app.spec.js.
//
// One test per expected result. The sessions build up -- 50 words, then 150, then 800 -- so a problem shows up in a few
// minutes on a short session before an hour is spent on the long one.

const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const { test, expect } = require('../../fixtures');
const { BASE_URL } = require('../../config/env');
const { App } = require('../../pages/app');
const { layoutHandwriting, lessonText } = require('../../pages/lib/handwriting');
const { pinForModule } = require('../../config/moduleClassMap');

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

/** Reload the app and wait until at least `count` strokes are back; returns how long that took (ms). */
const reloadUntil = async (user, count) => {
  const t0 = Date.now();
  await user.page.reload();
  await user.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
  await user.toolbar.wbSvg.waitFor({ state: 'visible', timeout: 20000 });
  await expect
    .poll(() => user.toolbar.pathCount(), { message: 'strokes loaded after the reload', timeout: 60000 })
    .toBeGreaterThanOrEqual(count);
  return Date.now() - t0;
};

// --- One writing session, several tests ---
//
// Writing is the slow part (800 words take about an hour), so each session is written once, by its first test, which
// checks only that every stroke landed. The tests after it each check one more result on the same session: autosave,
// speed, reload, topic switch. The writing test saves what they need (the board's strokes, per-word timings, the
// autosave messages) to a file in this run's output folder. Playwright empties that folder at the start of every run, so
// the file always comes from this run; it cannot be shared in memory, because after a failed test Playwright starts a
// fresh worker. Run without their writing test, the later tests skip with that reason.
//
// The board is cleared when a session's writing test starts and by the session's last test. If the writing itself
// fails, the writing test clears the board and saves nothing, and the later tests skip.
const sessionFile = (key) => path.join(test.info().project.outputDir, `wb-08-session-${key}.json`);
const needSession = (key, writer) => {
  let session = null;
  try {
    session = JSON.parse(fs.readFileSync(sessionFile(key), 'utf8'));
  } catch {
    // no session this run
  }
  test.skip(!session, `needs the session that ${writer} writes earlier in the same run (run the whole file)`);
  return session;
};
// The writing stays on the board: it is never cleared (owner rule 2026-09-29), only the session record is removed.
const endSession = async (user, key) => {
  fs.rmSync(sessionFile(key), { force: true });
};

// Continuous use ends in a forced sign-out at about 40 minutes (45 at most; owner, 2026-09-28 -- LOG-06-02), so a long
// session is written in chunks of CHUNK words, checking after each chunk that the teacher is still signed in. On a
// sign-out the writer does what a teacher would: signs back in, finds the topic again, PANS BELOW what is already on the
// board (so new writing never lands on top of old -- owner, 2026-09-28) and rewrites the interrupted chunk. What the
// board held before the sign-out is compared with what it holds after signing back in (WB-08-20).
const CHUNK = 10;

/** Handwrite `pages`, carrying on across forced sign-outs. Returns per-word timings, how many strokes of the chunks
 * written while signed in did not land, and what each sign-out cost. */
const writeAcrossSignOuts = async (user, pages, area) => {
  const signedIn = () => user.login.avatar.isVisible().catch(() => false);
  const timings = [];
  const signOuts = [];
  let dropped = 0;
  let lastBoard = await user.content.pathGeometry();
  const resume = async () => {
    const at = Date.now();
    await user.signIn(pinForModule('toolbarGeneral'));
    await user.nav.applyClassMap('toolbarGeneral');
    await user.toolbar.wbSvg.waitFor({ state: 'visible', timeout: 20000 });
    await expect
      .poll(() => user.toolbar.pathCount(), { message: 'the board loaded after signing back in', timeout: 60000 })
      .toBeGreaterThanOrEqual(Math.max(0, lastBoard.length - 50));
    await user.toolbar.waitForBoardToSettle();
    const board = await user.content.pathGeometry();
    signOuts.push({ at, before: lastBoard.length, lost: lastBoard.filter((d) => !board.includes(d)).length });
    lastBoard = board;
    await user.content.panBelowExistingWriting();
  };
  for (let p = 0; p < pages.length; p++) {
    if (p > 0) await user.content.panUp(area.height + 40);
    const words = pages[p].words;
    for (let i = 0; i < words.length; i += CHUNK) {
      const chunk = words.slice(i, i + CHUNK);
      const strokes = chunk.reduce((n, w) => n + w.strokes.length, 0);
      for (;;) {
        if (!(await signedIn())) await resume();
        const before = await user.toolbar.pathCount();
        const t = await user.content.writeHandwriting([{ ...pages[p], words: chunk }], { step: 6 });
        if (!(await signedIn())) {
          // Signed out part-way through: those strokes went to the Guest board. Sign back in and write the chunk again.
          await resume();
          continue;
        }
        dropped += Math.max(0, strokes - ((await user.toolbar.pathCount()) - before));
        timings.push(...t);
        lastBoard = await user.content.pathGeometry();
        break;
      }
    }
  }
  return { timings, dropped, signOuts };
};

/** Move below the teacher's existing writing (never clearing it), handwrite `words` words (panning to fresh space as
 * pages fill up) and save the session's record. */
const writeSession = async (user, key, words) => {
  fs.rmSync(sessionFile(key), { force: true });
  await user.content.startOnFreshSpace();
  const area = await user.content.writingArea();
  const pages = layoutHandwriting(lessonText(words), area);
  await user.content.startSaveLog();
  // Also record the save requests themselves: the on-screen "Whiteboard Saved!" message is brief and could be missed,
  // so WB-08-11 reports both (2026-09-28: a 14-minute gap between messages needed confirming at the network level).
  // Any POST/PUT whose URL looks like a board/annotation save; every such URL is listed so the pattern can be tightened.
  const saveRequests = [];
  const onRequest = (r) => {
    if (
      ['POST', 'PUT', 'PATCH'].includes(r.method()) &&
      /whiteboard|board|annotation|canvas|drawing|save/i.test(r.url())
    )
      saveRequests.push({ at: Date.now(), url: r.url().replace(/\?.*$/, '') });
  };
  user.page.on('request', onRequest);
  // If the session fails part-way, what was written stays on the board (never cleared) and the error propagates.
  const started = Date.now();
  const written = await writeAcrossSignOuts(user, pages, area);
  const finished = Date.now();
  const geometry = await user.content.pathGeometry();
  const finalSave = await waitForSaveAfter(user, finished);
  user.page.off('request', onRequest);
  const session = {
    saveRequests,
    words: pages.reduce((n, p) => n + p.words.length, 0),
    pages: pages.length,
    expected: strokeCount(pages),
    dropped: written.dropped,
    signOuts: written.signOuts,
    geometry,
    ms: written.timings.map((t) => t.ms),
    started,
    finished,
    saves: (await user.content.savedMessages()).filter((m) => /saved/i.test(m.text)).map((m) => m.at),
    finalSave: finalSave ? finalSave.at : null,
  };
  fs.mkdirSync(path.dirname(sessionFile(key)), { recursive: true });
  fs.writeFileSync(sessionFile(key), JSON.stringify(session));
  test.info().annotations.push({
    type: 'note',
    description:
      `${session.words} words, ${session.expected} strokes written in ${Math.round((finished - started) / 1000)} s over ` +
      `${session.pages} pages; ${geometry.length} strokes on the board; ${session.dropped} dropped; forced sign-outs: ` +
      `${session.signOuts.map((s) => `${Math.round((s.at - started) / 60000)} min (${s.lost} of ${s.before} strokes lost)`).join(', ') || 'none'}.`,
  });
  return session;
};

// The two tests every session size has: every stroke lands, and after a reload every stroke is back exactly.
// "Lands" is measured chunk by chunk while signed in (a chunk rewritten after a forced sign-out is counted once).
const landsTest = (id, key, words, minutes) =>
  test(
    `${id}: a teacher handwrites about ${words} words with panning, and every stroke lands on the board`,
    { tag: ['@long', '@regression'] },
    async ({ user }) => {
      test.setTimeout(minutes * 60 * 1000);
      const session = await writeSession(user, key, words);
      expect(session.dropped, 'strokes written while signed in that did not land on the board').toBe(0);
    }
  );

const reloadTest = (id, key, words, writer, { last } = {}) =>
  test(
    `${id}: after handwriting about ${words} words, a reload brings every stroke back exactly`,
    { tag: ['@regression'] },
    async ({ user }) => {
      test.setTimeout(10 * 60 * 1000);
      const session = needSession(key, writer);
      try {
        await user.page.waitForTimeout(15000); // anything written just before is past the autosave countdown
        await reloadUntil(user, session.geometry.length);
        expect(await user.content.pathGeometry(), 'the same strokes, with exactly the same shape').toEqual(
          session.geometry
        );
      } finally {
        if (last) await endSession(user, key);
      }
    }
  );

test.describe('WB-08 Long teaching session: 50, 150, then 800 words', () => {
  test.use({ classMap: 'toolbarGeneral' });

  // 50 words (a few minutes)
  landsTest('WB-08-07', 'w50', 50, 15);
  reloadTest('WB-08-08', 'w50', 50, 'WB-08-07', { last: true });

  // 150 words (about 10 minutes)
  landsTest('WB-08-09', 'w150', 150, 30);
  reloadTest('WB-08-10', 'w150', 150, 'WB-08-09', { last: true });

  // 800 words (about an hour). CONFIRMED LIVE (2026-09-27): 800 words + 4 pans took just under 60 minutes with correct
  // (non-garbled) point-by-point input; a 60-minute cap force-closes the page mid-cleanup. 100 minutes.
  landsTest('WB-08-01', 'w800', 800, 100);

  test(
    'WB-08-20: across the forced sign-out during the 800-word session, nothing already written is lost',
    { tag: ['@long', '@regression'] },
    async () => {
      const session = needSession('w800', 'WB-08-01');
      test.skip(
        !session.signOuts.length,
        'no forced sign-out happened during the session (itself a finding: LOG-06-02 expects one at about 40 minutes)'
      );
      const lost = session.signOuts.reduce((n, s) => n + s.lost, 0);
      test.info().annotations.push({
        type: 'note',
        description: session.signOuts.map((s) => `${s.lost} of ${s.before} strokes lost`).join('; '),
      });
      expect(lost, 'strokes on the board before the forced sign-out that were gone after signing back in').toBe(0);
    }
  );

  test(
    'WB-08-11: during the 800-word session autosave runs as the teacher writes, not only at the end',
    { tag: ['@long', '@regression'] },
    async () => {
      const session = needSession('w800', 'WB-08-01');
      const during = session.saves.filter((at) => at <= session.finished);
      let longestGap = 0;
      let prev = session.started;
      for (const at of [...during, session.finished]) {
        longestGap = Math.max(longestGap, at - prev);
        prev = at;
      }
      // Cross-check against the save requests actually sent (the message on screen is brief and could be missed).
      const requests = (session.saveRequests || []).filter((r) => r.at <= session.finished);
      let longestRequestGap = 0;
      prev = session.started;
      for (const at of [...requests.map((r) => r.at), session.finished]) {
        longestRequestGap = Math.max(longestRequestGap, at - prev);
        prev = at;
      }
      const urls = [...new Set(requests.map((r) => r.url))];
      test.info().annotations.push(
        {
          type: 'note',
          description: `${during.length} "Whiteboard Saved!" messages while writing; longest gap ${Math.round(longestGap / 1000)} s`,
        },
        {
          type: 'note',
          description: `${requests.length} save-like requests while writing; longest gap ${Math.round(longestRequestGap / 1000)} s; URLs: ${urls.join(' | ') || 'none'}`,
        }
      );
      // No fixed time limit here (owner, 2026-09-28: how long a teacher writes cannot be predicted); whether autosave keeps
      // up at 10, 15, ... 35 minutes is checked from the server side by WB-08-21..26. The gaps are reported above.
      // Counted from the app's own "Whiteboard Saved!" messages; the request pattern is too broad to count on its own.
      expect(during.length, 'at least one "Whiteboard Saved!" while writing, not only at the end').toBeGreaterThan(0);
    }
  );

  test(
    'WB-08-12: a "Whiteboard Saved!" message follows the last word of the 800-word session',
    { tag: ['@long', '@regression'] },
    async () => {
      const session = needSession('w800', 'WB-08-01');
      expect(session.finalSave, 'a save message within a minute of the last word').not.toBeNull();
    }
  );

  test(
    'WB-08-02: the last 100 words of the 800-word session are not much slower to write than the first 100',
    { tag: ['@long', '@performance'] },
    async () => {
      const session = needSession('w800', 'WB-08-01');
      const first100 = avg(session.ms.slice(0, 100));
      const last100 = avg(session.ms.slice(-100));
      test.info().annotations.push({
        type: 'note',
        description: `${session.words} words; ms per word: first 100 = ${first100}, last 100 = ${last100}.`,
      });
      expect(last100, 'the board does not bog down as it fills up').toBeLessThanOrEqual(first100 * 2);
    }
  );

  reloadTest('WB-08-13', 'w800', 800, 'WB-08-01');

  test(
    'WB-08-14: after the 800-word session, a reload shows the full board within 20 seconds',
    { tag: ['@long', '@performance'] },
    async ({ user }) => {
      test.setTimeout(10 * 60 * 1000);
      const session = needSession('w800', 'WB-08-01');
      const ms = await reloadUntil(user, session.geometry.length);
      test.info().annotations.push({ type: 'note', description: `All strokes back ${ms} ms after the reload.` });
      expect(ms, 'the full board is back within 20 s').toBeLessThanOrEqual(20000);
    }
  );

  test(
    'WB-08-06: after the 800-word session, switching to another topic and back brings back the full board',
    { tag: ['@long', '@edge'] },
    async ({ user }) => {
      test.setTimeout(10 * 60 * 1000);
      const session = needSession('w800', 'WB-08-01');
      try {
        // Start from the board as it is now, fully loaded: whether a reload keeps every stroke is WB-08-13's check.
        await expect
          .poll(() => user.toolbar.pathCount(), { message: 'the session is on the board', timeout: 60000 })
          .toBeGreaterThanOrEqual(session.geometry.length);
        await user.toolbar.waitForBoardToSettle();
        const before = await user.content.pathGeometry();
        test.info().annotations.push({ type: 'note', description: `${before.length} strokes on the board.` });

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
        await endSession(user, 'w800');
      }
    }
  );
});

// --- Autosave while the teacher keeps writing, checked from the server side at 10, 15, 20, 25, 30 and 35 minutes ---
//
// How long a teacher writes cannot be predicted (owner, 2026-09-28), so autosave is checked at several points of one
// continuous session, staying under the ~40-minute forced sign-out (LOG-06-02). The writer never stops; at each
// checkpoint a SECOND, separate session signed in to the same account opens the same board and reads what the SERVER has
// saved -- a direct check that the annotations were autosaved, without disturbing the writer. One test per checkpoint:
// at N minutes, everything written in the first N-5 minutes (i.e. up to the previous checkpoint) must already be saved;
// how far the saved board lags behind the writing is reported each time.
// WB-08-21 writes the session and checks the 10-minute point; WB-08-22..26 read the other checkpoints from the file it
// saves in this run's output folder (see "One writing session, several tests" above).
const CHECKPOINTS = [10, 15, 20, 25, 30, 35];

/** A separate browser session (its own storage) signed in to the same account and on the same topic. */
const openReader = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1920, height: 1080 } });
  const reader = new App(await context.newPage());
  await reader.page.goto('./');
  return { browser, reader };
};

/** What the server has saved on the topic's board right now, read through the second session. */
const readSavedBoard = async (reader) => {
  await reader.page.reload();
  // Idle between checkpoints, the reader gets the Sign Out / Continue popup and is signed out (LOG-05); sign in again.
  if (
    !(await reader.login.avatar
      .waitFor({ state: 'visible', timeout: 15000 })
      .then(() => true)
      .catch(() => false))
  )
    await reader.signIn(pinForModule('toolbarGeneral'));
  await reader.nav.applyClassMap('toolbarGeneral');
  await reader.toolbar.wbSvg.waitFor({ state: 'visible', timeout: 20000 });
  await reader.page.waitForTimeout(3000);
  await reader.toolbar.waitForBoardToSettle();
  return reader.content.pathGeometry();
};

const checkpointTest = (id, minutes) =>
  test(
    `${id}: after ${minutes} minutes of continuous writing, everything written in the first ${minutes - 5} minutes is already autosaved`,
    { tag: ['@long', '@regression'] },
    async () => {
      const session = needSession('autosave', 'WB-08-21');
      const cp = session.checkpoints.find((c) => c.minutes === minutes);
      test.skip(!cp, `the session did not reach ${minutes} minutes (see WB-08-21's notes)`);
      test.info().annotations.push({ type: 'note', description: cp.note });
      expect(cp.missing, `strokes written in the first ${minutes - 5} minutes not yet saved at minute ${minutes}`).toBe(
        0
      );
    }
  );

test.describe('WB-08 Autosave while the teacher keeps writing: 10, 15, 20, 25, 30, 35 minutes', () => {
  test.use({ classMap: 'toolbarGeneral' });

  test(
    'WB-08-21: after 10 minutes of continuous writing, everything written in the first 5 minutes is already autosaved',
    { tag: ['@long', '@regression'] },
    async ({ user }) => {
      test.setTimeout(55 * 60 * 1000);
      fs.rmSync(sessionFile('autosave'), { force: true });
      await user.content.startOnFreshSpace();
      const area = await user.content.writingArea();
      const pages = layoutHandwriting(lessonText(3000), area, { seed: 71 });
      const { browser, reader } = await openReader();
      const start = Date.now();
      const written = []; // { at, d } for every stroke, in order
      const checkpoints = [];
      const due = [...CHECKPOINTS];
      try {
        const known = new Set(await user.content.pathGeometry());
        outer: for (let p = 0; p < pages.length; p++) {
          if (p > 0) await user.content.panUp(area.height + 40);
          for (let i = 0; i < pages[p].words.length; i += CHUNK) {
            await user.content.writeHandwriting([{ ...pages[p], words: pages[p].words.slice(i, i + CHUNK) }], {
              step: 6,
            });
            const now = Date.now();
            for (const d of await user.content.pathGeometry())
              if (!known.has(d)) {
                known.add(d);
                written.push({ at: now, d });
              }
            if (due.length && now - start >= due[0] * 60000) {
              const minutes = due.shift();
              const saved = new Set(await readSavedBoard(reader));
              const cutoff = start + (minutes - 5) * 60000;
              const mustBeSaved = written.filter((w) => w.at <= cutoff);
              const missing = mustBeSaved.filter((w) => !saved.has(w.d)).length;
              const newestSaved = [...written].reverse().find((w) => saved.has(w.d));
              const lag = newestSaved ? Math.round((Date.now() - newestSaved.at) / 1000) : null;
              checkpoints.push({
                minutes,
                missing,
                note:
                  `At ${minutes} min: ${written.length} strokes written, ${saved.size} on the server's board; ` +
                  `${missing} of the ${mustBeSaved.length} written in the first ${minutes - 5} min not saved; ` +
                  `the saved board is ${lag === null ? 'empty' : `${lag} s`} behind the writing.`,
              });
              if (!due.length) break outer;
            }
          }
        }
      } finally {
        await browser.close().catch(() => {});
        fs.mkdirSync(path.dirname(sessionFile('autosave')), { recursive: true });
        fs.writeFileSync(sessionFile('autosave'), JSON.stringify({ start, checkpoints }));
      }
      test.info().annotations.push({ type: 'note', description: checkpoints.map((c) => c.note).join(' | ') });
      const cp = checkpoints.find((c) => c.minutes === 10);
      expect(cp, 'set-up: the session reached 10 minutes').toBeTruthy();
      expect(cp.missing, 'strokes written in the first 5 minutes not yet saved at minute 10').toBe(0);
    }
  );

  checkpointTest('WB-08-22', 15);
  checkpointTest('WB-08-23', 20);
  checkpointTest('WB-08-24', 25);
  checkpointTest('WB-08-25', 30);

  test(
    'WB-08-26: after 35 minutes of continuous writing, everything written in the first 30 minutes is already autosaved',
    { tag: ['@long', '@regression'] },
    async ({ user }) => {
      const session = needSession('autosave', 'WB-08-21');
      try {
        const cp = session.checkpoints.find((c) => c.minutes === 35);
        test.skip(!cp, 'the session did not reach 35 minutes (see WB-08-21’s notes)');
        test.info().annotations.push({ type: 'note', description: cp.note });
        expect(cp.missing, 'strokes written in the first 30 minutes not yet saved at minute 35').toBe(0);
      } finally {
        await endSession(user, 'autosave');
      }
    }
  );
});

test.describe('WB-08 Long teaching session', () => {
  // Fresh space below the teacher's writing; nothing is erased before or after (owner rule 2026-09-29).
  test.use({ classMap: 'toolbarGeneral', freshSpace: true });

  test.afterEach(async ({ app }) => {
    await app.page.unroute('**/*').catch(() => {});
  });

  // --- The network drops while the teacher keeps writing: four results, four tests. Each runs the scenario up to the
  // point it checks (the network state cannot carry over from one test to the next). ---

  /** Write online until saved, then cut the network and write more; returns what was written and when. */
  const writeThroughOutage = async (user, page) => {
    const area = await user.content.writingArea();
    const part1 = layoutHandwriting(lessonText(15), area, { seed: 3 });
    const part2 = layoutHandwriting(
      lessonText(15),
      { ...area, y: area.y + area.height / 2, height: area.height / 2 },
      { seed: 5 }
    );
    await user.content.startSaveLog();
    await user.content.writeHandwriting(part1);
    // Set-up check: if saving does not work even online, the offline results mean nothing.
    expect(await waitForSaveAfter(user, Date.now() - 1000), 'the first part saves normally online').not.toBeNull();

    // Network down (context.setOffline is a no-op in the desktop client, see HDR-07-04): every request fails.
    await page.route('**/*', (route) => route.abort('internetdisconnected'));
    const offlineAt = Date.now();
    await user.content.writeHandwriting(part2);
    await page.waitForTimeout(20000); // longer than the autosave countdown
    return { area, offlineAt, expected: strokeCount(part1) + strokeCount(part2) };
  };

  /** Bring the network back and write one more word, as a teacher who keeps writing would; returns when. */
  const backOnline = async (user, page, area) => {
    await page.unroute('**/*');
    const at = Date.now();
    await user.content.writeHandwriting(
      layoutHandwriting('done', { ...area, y: area.y + area.height - 60 }, { seed: 9 })
    );
    return at;
  };

  test(
    'WB-08-03: writing continues while the network is down, and everything written offline stays on the board',
    { tag: ['@negative', '@regression'] },
    async ({ user, page }) => {
      test.setTimeout(10 * 60 * 1000);
      const { expected } = await writeThroughOutage(user, page);
      expect(await user.toolbar.pathCount(), 'everything written offline is on the board').toBe(expected);
    }
  );

  test(
    'WB-08-15: while the network is down, the app does not claim "Whiteboard Saved!"',
    { tag: ['@negative', '@regression'] },
    async ({ user, page }) => {
      test.setTimeout(10 * 60 * 1000);
      const { offlineAt } = await writeThroughOutage(user, page);
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
      expect(
        offlineMessages.some((t) => /saved/i.test(t)),
        'no "Whiteboard Saved!" while nothing can reach the server'
      ).toBe(false);
    }
  );

  test(
    'WB-08-16: once the network is back, autosave resumes',
    { tag: ['@negative', '@regression'] },
    async ({ user, page }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-27 and 2026-09-28): after the network comes back, no "Whiteboard Saved!" appears again -- autosave does not resume
      test.fail(true, 'Autosave does not resume after the network comes back');
      test.setTimeout(10 * 60 * 1000);
      const { area } = await writeThroughOutage(user, page);
      const since = await backOnline(user, page, area);
      expect(await waitForSaveAfter(user, since, 60000), 'a save message after the network is back').not.toBeNull();
    }
  );

  // After the network is back and the app is reloaded: what was written OFFLINE is kept (WB-08-17), and what was written
  // AFTER the network came back is kept (WB-08-19) -- one test each (split 2026-09-28, when a live run lost exactly the
  // one word written after reconnecting while every offline stroke survived).
  /** Write through an outage, reconnect, write one more word, then reload; returns the strokes by phase. */
  const outageThenReload = async (user, page) => {
    const { area } = await writeThroughOutage(user, page);
    const offline = await user.content.pathGeometry(); // everything up to and including the offline writing
    await backOnline(user, page, area);
    const onScreen = await user.content.pathGeometry();
    const afterReconnect = onScreen.filter((d) => !offline.includes(d));
    await page.waitForTimeout(15000);
    await page.reload();
    await user.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(5000);
    await user.toolbar.waitForBoardToSettle();
    const reloaded = await user.content.pathGeometry();
    test.info().annotations.push({
      type: 'note',
      description: `Before reload: ${offline.length} strokes up to the outage + ${afterReconnect.length} after reconnecting; after reload: ${reloaded.length}`,
    });
    return { offline, afterReconnect, reloaded };
  };

  test(
    'WB-08-17: after the network is back and the app is reloaded, nothing written offline is lost',
    { tag: ['@negative', '@regression'] },
    async ({ user, page }) => {
      test.setTimeout(10 * 60 * 1000);
      const { offline, reloaded } = await outageThenReload(user, page);
      expect(
        offline.filter((d) => !reloaded.includes(d)),
        'strokes written before and during the outage that are missing after a reload'
      ).toHaveLength(0);
    }
  );

  test(
    'WB-08-19: what the teacher writes after the network comes back is still there after a reload',
    { tag: ['@negative', '@regression'] },
    async ({ user, page }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-28): a consequence of WB-08-16 (autosave does not resume after the
      // network comes back) -- the word written after reconnecting was lost on reload, while every offline stroke was kept.
      test.fail(
        true,
        'Autosave does not resume after the network comes back, so writing done after reconnecting is lost'
      );
      test.setTimeout(10 * 60 * 1000);
      const { afterReconnect, reloaded } = await outageThenReload(user, page);
      expect(afterReconnect.length, 'set-up: a word was written after reconnecting').toBeGreaterThan(0);
      expect(
        afterReconnect.filter((d) => !reloaded.includes(d)),
        'strokes written after the network came back that are missing after a reload'
      ).toHaveLength(0);
    }
  );

  // --- Undo and Redo after a long passage: one test each ---

  /** Handwrite a 60-word passage, then Undo once; returns the board before the Undo. */
  const writeThenUndo = async (user) => {
    const area = await user.content.writingArea();
    await user.content.writeHandwriting(layoutHandwriting(lessonText(60), area, { seed: 11 }));
    const before = await user.content.pathGeometry();
    await user.toolbar.tool('gtUndo').click({ force: true });
    await expect.poll(() => user.toolbar.pathCount(), { timeout: 10000 }).toBe(before.length - 1);
    return before;
  };

  test('WB-08-05: Undo after a long passage removes only the last stroke', { tag: ['@edge'] }, async ({ user }) => {
    test.setTimeout(10 * 60 * 1000);
    const before = await writeThenUndo(user);
    expect(await user.content.pathGeometry(), 'only the very last stroke went').toEqual(before.slice(0, -1));
  });

  test('WB-08-18: Redo after that Undo puts the same stroke back', { tag: ['@edge'] }, async ({ user }) => {
    test.setTimeout(10 * 60 * 1000);
    const before = await writeThenUndo(user);
    await user.toolbar.tool('gtRedo').click({ force: true });
    await expect.poll(() => user.toolbar.pathCount(), { timeout: 10000 }).toBe(before.length);
    expect(await user.content.pathGeometry(), 'Redo puts back the same stroke').toEqual(before);
  });
});
