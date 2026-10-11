// RSL-07 — A full school day without restarting
// Source: CEPV2_Stories/18_Resilience.md
// RSL-07-01/02 run a scripted school day on the worker's client without restarting it: six periods, each in one of
// the main teacher's classes (topic 1.1 of each, never a protected board): sign in, open the topic, write a page on
// fresh space below what is there, play a video, open a PDF and run a quiz when the topic has them, sign out (the
// session ends after 40-45 min anyway). Between periods the client is left open, idle (DAY_PERIOD_MINUTES, default
// 60: a 6-hour day). Nothing is sent and nothing is erased.
// RSL-07-03 opens every kind of asset 'playersDefault' (12A Computer Science 2.2) has, together, each annotated.
// RSL-07-04 double- and triple-clicks the main buttons the other modules do not cover (Magnet items, class, topic).

const { test, expect } = require('../../fixtures');
const { TEACHER_CLASSES, clientApp } = require('../00-flows/flow-helpers');
const { writeStrokes } = require('./resilience-lib');

const PERIOD_MINUTES = Number(process.env.DAY_PERIOD_MINUTES || 60);
const PERIODS = TEACHER_CLASSES.slice(0, 6);

/** Time one step (ms). */
const timed = async (fn) => {
  const t0 = Date.now();
  await fn();
  return Date.now() - t0;
};

/** One period: sign in, open the class's topic 1.1, write a page, video, PDF, quiz, sign out. Returns step times. */
async function period(app, [grade, division, subject]) {
  const steps = {};
  const page = app.page;
  steps.signIn = await timed(() => app.signIn());
  steps.openTopic = await timed(async () => {
    await app.nav.resetToClass(grade, division, subject);
    await app.nav.goToChapterTopic(0, 0);
    await app.toolbar.waitForBoardToSettle();
  });
  await app.content.startOnFreshSpace();
  steps.writePage = await timed(() => writeStrokes(app, 30));
  await app.playlist.ensureDrawerVisible();
  const player = app.player;
  if (await player.videoCards.count()) {
    steps.video = await timed(async () => {
      await player.openResourceCard(player.videoCards);
      await player.isPlayerOpen(20000);
      await page.waitForTimeout(5000);
    });
    await player.closePlayer();
  }
  if (await player.worksheetCards.count()) {
    steps.pdf = await timed(async () => {
      await player.openResourceCard(player.worksheetCards);
      await player.isPlayerOpen(20000);
    });
    await player.closePlayer();
  }
  if (await player.quizCards.count()) {
    steps.quiz = await timed(async () => {
      const { reachedQuestion } = await player.startQuiz();
      if (reachedQuestion) await player.answerCurrentQuestion(0);
    });
    await player.quizCloseBtn.click({ force: true }).catch(() => {});
    await player.closePlayer();
  }
  await app.userMenu.signOut();
  return steps;
}

/** Run the day; `afterPeriod(i, steps)` is called after each period. Returns every period's step times. */
async function schoolDay(app, afterPeriod = async () => {}) {
  const day = [];
  for (let i = 0; i < PERIODS.length; i++) {
    const start = Date.now();
    const steps = await period(app, PERIODS[i]);
    day.push(steps);
    await afterPeriod(i, steps);
    const rest = PERIOD_MINUTES * 60000 - (Date.now() - start);
    if (i < PERIODS.length - 1 && rest > 0) await app.page.waitForTimeout(rest);
  }
  return day;
}

test.describe('RSL-07 A full school day without restarting', () => {
  test.describe('the school day', () => {
    test.skip(!!process.env.RUN_IN_BROWSER, 'a day on the desktop client: no browser equivalent');
    test.describe.configure({ timeout: (PERIOD_MINUTES * PERIODS.length + 60) * 60 * 1000 });

    test(
      'RSL-07-01: a scripted 6-hour day; no crash, and each step is no slower at the end than at the start',
      { tag: ['@performance', '@long'] },
      async ({ workerApp }) => {
        const app = await clientApp(workerApp);
        const crashes = [];
        app.page.on('crash', () => crashes.push(Date.now()));
        const day = await schoolDay(app);
        test
          .info()
          .annotations.push({ type: 'note', description: `Step times (ms) per period: ${JSON.stringify(day)}` });
        expect(crashes, 'no crash all day').toEqual([]);
        // Steps every period has (the same work in every class); allowed: 50% slower plus 2 s.
        const first = day[0];
        const last = day[day.length - 1];
        const slower = ['signIn', 'openTopic', 'writePage'].filter((k) => last[k] > first[k] * 1.5 + 2000);
        expect(slower, 'no step is slower in the last period than in the first').toEqual([]);
      }
    );

    test(
      "RSL-07-02: the client's memory use is recorded every period; it does not keep growing",
      { tag: ['@performance', '@long'] },
      async ({ workerApp }) => {
        const app = await clientApp(workerApp);
        // Memory of every process of the client (KB), from Electron itself.
        const memory = () =>
          workerApp.app.evaluate(({ app: electronApp }) =>
            electronApp.getAppMetrics().reduce((sum, p) => sum + (p.memory ? p.memory.workingSetSize : 0), 0)
          );
        const used = [Math.round((await memory()) / 1024)];
        await schoolDay(app, async () => used.push(Math.round((await memory()) / 1024)));
        test.info().annotations.push({
          type: 'note',
          description: `Memory (MB) at the start and after each period: ${used.join(', ')}`,
        });
        // Level: the last reading is at most 50% above the reading after the first period, and it did not rise
        // after every single period.
        const rises = used.slice(2).filter((m, i) => m > used[i + 1]).length;
        expect(used[used.length - 1], 'no more than 50% above the first period').toBeLessThanOrEqual(used[1] * 1.5);
        expect(rises, 'it does not rise period after period').toBeLessThan(used.length - 2);
      }
    );
  });

  test.describe('many players at once', () => {
    test.use({ classMap: 'playersDefault', freshSpace: true });

    test(
      'RSL-07-03: a video, a PDF, an image, a web link, a quiz and a code editor open at once, each annotated; all stay usable and each keeps its own annotation',
      { tag: ['@edge'] },
      async ({ user, page }) => {
        test.setTimeout(300000);
        const p = user.player;
        const kinds = {
          video: p.videoCards,
          PDF: p.worksheetCards,
          image: p.imageCards,
          'web link': p.weblinkCards,
          quiz: p.quizCards,
          'code editor': page.locator(
            '[data-qa-id="playlist-resource-card"]:has(img.type-icon[src*="ic.code" i]), [data-qa-id="playlist-asset-card"]:has(img.type-icon[src*="ic.code" i])'
          ),
        };
        const strokes = () =>
          page
            .locator('svg.annotation-layer path, [data-qa-id="wb-drawing-container"] svg path')
            .evaluateAll((els) => els.map((e) => e.getAttribute('d')));
        const players = page.locator('.resources-player, .player-container .player, lib-quiz-renderer, tce-code-main');
        const opened = [];
        const missing = [];
        try {
          for (const [kind, cards] of Object.entries(kinds)) {
            if (!(await cards.count())) {
              missing.push(kind);
              continue;
            }
            await p.openResourceCard(cards);
            await p.isPlayerOpen(20000);
            await page.waitForTimeout(kind === 'code editor' ? 6000 : 3000);
            const box = (await players.filter({ visible: true }).last().boundingBox()) || {
              x: 400,
              y: 200,
              width: 800,
              height: 400,
            };
            const before = new Set(await strokes());
            await user.toolbar.selectTool('gtPen');
            // drawStroke takes board-relative points: the middle of the asset on top, a little lower for each one.
            const svg = await user.toolbar.wbSvg.boundingBox();
            const x = box.x + box.width / 2 - 80 - svg.x;
            const y = box.y + Math.min(box.height / 2, 260) + opened.length * 12 - svg.y;
            await user.toolbar.drawStroke({ x, y }, { x: x + 160, y: y + 30 });
            const mine = (await strokes()).filter((d) => !before.has(d));
            opened.push({ kind, mine });
          }
          const now = new Set(await strokes());
          const lost = opened.filter((o) => !o.mine.length || o.mine.some((d) => !now.has(d))).map((o) => o.kind);
          expect(opened.length, 'set-up: at least three kinds open together').toBeGreaterThanOrEqual(3);
          expect(lost, 'each open asset keeps its own annotation').toEqual([]);
          // All stay usable: each one closes in turn, and the board is back on top at the end.
          for (let i = 0; i < opened.length; i++) await p.closePlayer();
          expect((await p.leftoversAfterClose()).boardOnTop, 'every player closed cleanly').toBe(true);
        } finally {
          for (let i = 0; i < 6; i++) await p.closePlayer().catch(() => {});
        }
        if (missing.length)
          throw new Error(
            `DATA MISSING ON THIS SERVER: playersDefault has no ${missing.join(', ')} card (checked the rest)`
          );
      }
    );
  });

  test.describe('double and triple clicks', () => {
    test.use({ classMap: 'aiHomework' });

    test(
      'RSL-07-04: double and triple clicks on the Magnet items, the class and the topic each act once',
      { tag: ['@edge'] },
      async ({ user, page }) => {
        // Magnet items: one panel each.
        for (const [name, panel] of [
          ['homework', user.aiHomework.selectChapterBtn],
          ['learningShorts', user.learningShorts.recordStartBtn],
        ]) {
          await user.magnet.open();
          await user.magnet.items[name].dblclick({ force: true });
          await page.waitForTimeout(3000);
          await expect.soft(panel.filter({ visible: true }), `${name}: one panel`).toHaveCount(1);
          await user.aiHomework.closeAll();
          await user.learningShorts.closeAll();
          await page.keyboard.press('Escape');
        }
        // A recent class pressed three times: one switch, and the chooser closes.
        await user.nav.ensureRecentClasses(2);
        await user.nav.openClassPopup();
        await user.nav.recentClassesTab.click({ timeout: 5000 }).catch(() => {});
        const before = (await user.nav.currentClassBtn.innerText()).replace(/\s+/g, ' ').trim();
        await user.nav.recentClassButtons.nth(1).click({ clickCount: 3, force: true });
        await page.waitForTimeout(4000);
        await expect
          .soft(user.nav.allMyClassesTab, 'the class chooser closed (not reopened by the extra clicks)')
          .toBeHidden();
        const after = (await user.nav.currentClassBtn.innerText()).replace(/\s+/g, ' ').trim();
        expect.soft(after, 'switched to the other class').not.toBe(before);
        // A topic pressed twice: it opens once, and the board is usable.
        await user.nav.goToChapterTopic(0, 0);
        await user.nav.openChaptersPopup();
        await user.nav.topicItems.first().waitFor({ state: 'visible', timeout: 10000 });
        await user.nav.topicItems.nth(1).dblclick({ force: true });
        await page.waitForTimeout(3000);
        await expect.soft(user.nav.currentChapterTopicBtn, 'on the topic pressed').toHaveText(/^\s*1\.2\s/);
        await expect.soft(user.nav.chapterItems.first(), 'the chapters popup closed').toBeHidden();
        await user.nav.applyClassMap('aiHomework');
      }
    );
  });
});
