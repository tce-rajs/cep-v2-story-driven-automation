// FLOW-25 — Any feature, in any order
// Source: CEPV2_Stories/00_EndToEndFlows.md
// Teachers jump between features mid-way. Data: the default class (Class 9A Science 4.1) on fresh space below the
// teacher's writing (never erased); 'attendance' (Class 10A Science) for the quiz + attendance case, where the register
// is only opened, never marked; 'playersDefault' (Class 12A Computer Science 2.2, worksheet) for Undo after a player.
// Nothing is sent; asset annotations are never wiped (each check looks at its own strokes only).

const { test, expect } = require('../../fixtures');
const {
  boardStrokes,
  waitForAutosave,
  writeStroke,
  reloadSignedIn,
  widgetsOnBoard,
  findTopicWhere,
} = require('./flow-helpers');

/** Open the first resource of the topic's Playlist and wait for its player. */
const openFirstResource = async (user) => {
  await user.playlist.ensureDrawerVisible();
  expect(await user.playlist.resourceCards.count(), 'set-up: a resource in the topic').toBeGreaterThan(0);
  await user.player.openResourceCard(user.playlist.resourceCards.first());
  expect(await user.player.isPlayerOpen(20000), 'set-up: the player is open').toBe(true);
};
const warning = (page) =>
  page
    .locator('mat-dialog-container, [role="dialog"], .modal-content')
    .filter({ hasText: /discard|unsaved|lose|not (be )?saved|are you sure|leave/i })
    .first();

test.describe('FLOW-25 Any feature, in any order', () => {
  test.describe.configure({ timeout: 240000 });

  test.afterEach(async ({ app }) => {
    await app.player.closePlayer().catch(() => {});
    await app.aiNotices.closeAll().catch(() => {});
    await app.learningShorts.closeAll().catch(() => {});
    await app.attendance.closeAll().catch(() => {});
  });

  test.describe('on the default board', () => {
    test.use({ classMap: 'scratchBoard', freshSpace: true });

    test(
      'FLOW-25-01: opening a playlist asset while writing keeps the writing',
      { tag: ['@negative'] },
      async ({ user }) => {
        const stroke = await writeStroke(user);
        await openFirstResource(user); // straight away, inside the autosave countdown
        await user.player.closePlayer();
        expect(await boardStrokes(user), 'the writing is on the board').toContain(stroke);
        await waitForAutosave(user);
        await reloadSignedIn(user);
        expect(await boardStrokes(user), 'and it was saved').toContain(stroke);
      }
    );

    test(
      'FLOW-25-02: switching to Plan Mode with a player open and back keeps the board',
      { tag: ['@negative'] },
      async ({ user }) => {
        await writeStroke(user);
        await waitForAutosave(user);
        const board = (await boardStrokes(user)).sort();
        await openFirstResource(user);
        expect((await user.compass.switchToPlanningMode()).switched, 'set-up: in Plan Mode').toBe(true);
        expect((await user.compass.switchToTeachingMode()).switched, 'set-up: back in Teach Mode').toBe(true);
        await user.login.avatar.waitFor({ state: 'visible', timeout: 20000 });
        await user.nav.applyClassMap('default');
        await user.toolbar.waitForBoardToSettle();
        expect((await boardStrokes(user)).sort(), 'the board is as it was').toEqual(board);
      }
    );

    test(
      'FLOW-25-04: opening AI Notices while the recorder runs keeps the recording or warns first',
      { tag: ['@negative'] },
      async ({ user, page }) => {
        const ls = user.learningShorts;
        await ls.openRecorder(user.magnet);
        await ls.assertCanRecord();
        await ls.recordStartBtn.click({ force: true });
        await expect(ls.recordStopBtn, 'set-up: recording').toBeVisible({ timeout: 15000 });
        await user.magnet.open();
        await user.magnet.noticeItem.click({ force: true }).catch(() => {});
        await page.waitForTimeout(2000);
        const warned = await warning(page)
          .isVisible()
          .catch(() => false);
        const stillRecording = await ls.recordStopBtn.isVisible().catch(() => false);
        expect(warned || stillRecording, 'the recording goes on, or the teacher is warned first').toBe(true);
      }
    );

    test(
      'FLOW-25-05: changing class with a notice half written warns before discarding',
      { tag: ['@negative'] },
      async ({ user, page }) => {
        const n = user.aiNotices;
        await n.openComposer(user, 'Annual day rehearsal tomorrow');
        await n.titleInput.fill(`Half written ${Date.now()}`);
        await n.hideKeyboard();
        const nav = user.nav;
        await nav.currentClassBtn.click({ force: true });
        if (await nav.allMyClassesTab.isVisible({ timeout: 4000 }).catch(() => false)) {
          await nav.allMyClassesTab.click({ timeout: 4000 }).catch(() => {});
          await nav
            .gradeButton('Class 10')
            .first()
            .click({ timeout: 4000 })
            .catch(() => {});
          await nav
            .divisionButton('A')
            .first()
            .click({ timeout: 4000 })
            .catch(() => {});
          await nav
            .subjectButton('Science')
            .first()
            .click({ timeout: 4000 })
            .catch(() => {});
        }
        await expect(warning(page), 'a warning before the half-written notice is thrown away').toBeVisible({
          timeout: 8000,
        });
      }
    );

    test(
      'FLOW-25-06: signing out with a player, widget or composer open saves the board and closes them',
      { tag: ['@negative'] },
      async ({ user, page }) => {
        const stroke = await writeStroke(user);
        await user.toolbar.openToolPanel('gtWidgets');
        await user.toolbar.widgetTool('Clock').click({ force: true });
        await expect.poll(() => widgetsOnBoard(page), { message: 'set-up: a widget is open' }).toBeGreaterThan(0);
        await openFirstResource(user);
        await user.userMenu.signOut();
        await expect(user.player.closeIcon, 'the player is closed').toHaveCount(0);
        expect(await widgetsOnBoard(page), 'the widget is closed').toBe(0);
        await user.signIn();
        await user.nav.applyClassMap('default');
        await user.toolbar.waitForBoardToSettle();
        expect(await boardStrokes(user), 'the board was saved').toContain(stroke);
        expect(await widgetsOnBoard(page), 'nothing left open after signing in').toBe(0);
      }
    );
  });

  test.describe('quiz and attendance', () => {
    test.use({ classMap: 'attendance' });

    test(
      'FLOW-25-03: opening attendance in the middle of a quiz keeps the quiz answers',
      { tag: ['@negative'] },
      async ({ user }) => {
        const found = await findTopicWhere(user, async () => (await user.player.quizCards.count()) > 0);
        if (!found) throw new Error('DATA MISSING ON THIS SERVER: no quiz in the first topics of Class 10A Science');
        const r = await user.player.startQuiz();
        expect(r.reachedQuestion, 'set-up: the quiz is on its first question').toBe(true);
        await user.player.answerCurrentQuestion(0);
        const marks = async () =>
          user.player.quizOptions.evaluateAll((els) =>
            els.map((e) => e.className.match(/\b(correct|incorrect)\b/)?.[1] || '')
          );
        const answered = await marks();
        expect(answered.some(Boolean), 'set-up: the answer is marked').toBe(true);

        await user.attendance.open(user.magnet);
        await user.attendance.closeAll();
        await expect(user.player.quizRenderer, 'the quiz is still open').toBeVisible();
        expect(await user.player.currentQuestionNumber(), 'on the same question').toBe(1);
        expect(await marks(), 'with the answer given').toEqual(answered);
      }
    );
  });

  test.describe('Undo after a player', () => {
    test.use({ classMap: 'playersDefault', freshSpace: true });

    test(
      'FLOW-25-07: using Undo after closing a player undoes board writing only',
      { tag: ['@negative'] },
      async ({ user }) => {
        const page = user.page;
        const stroke = await writeStroke(user);
        await expect(user.player.worksheetCards.first(), 'set-up: a worksheet in the topic').toBeAttached({
          timeout: 15000,
        });
        await user.player.openResourceCard(user.player.worksheetCards);
        expect(await user.player.isPlayerOpen(20000), 'set-up: the worksheet opens').toBe(true);
        await page.waitForTimeout(3000);
        const layer = user.player.worksheetAnnotationLayer.first();
        const notes = () => layer.locator('path').evaluateAll((els) => els.map((e) => e.getAttribute('d')));
        const before = await notes();
        await user.toolbar.selectTool('gtPen');
        const box = await layer.boundingBox();
        const viewH = await page.evaluate(() => window.innerHeight);
        const y = (Math.max(box.y, 0) + Math.min(box.y + box.height, viewH)) / 2;
        await page.mouse.move(box.x + box.width / 2 - 100, y);
        await page.mouse.down();
        for (let i = 1; i <= 12; i++) await page.mouse.move(box.x + box.width / 2 - 100 + i * 18, y + Math.sin(i) * 10);
        await page.mouse.up();
        await page.waitForTimeout(2500);
        const note = (await notes()).find((d) => !before.includes(d));
        expect(note, 'set-up: an annotation on the worksheet').toBeTruthy();
        await user.player.closePlayer();

        await user.toolbar.tool('gtUndo').click({ force: true });
        await expect
          .poll(() => boardStrokes(user), { message: 'Undo takes back the board writing' })
          .not.toContain(stroke);
        await user.playlist.ensureDrawerVisible();
        await user.player.openResourceCard(user.player.worksheetCards);
        expect(await user.player.isPlayerOpen(20000)).toBe(true);
        await expect.poll(notes, { message: 'the worksheet annotation is untouched', timeout: 15000 }).toContain(note);
      }
    );
  });
});
