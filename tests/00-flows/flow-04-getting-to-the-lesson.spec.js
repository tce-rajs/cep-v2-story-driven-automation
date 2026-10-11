// FLOW-04 — Getting to the lesson
// Source: CEPV2_Stories/00_EndToEndFlows.md
// Read-only except FLOW-04-08, which writes one stroke on fresh space of the default board (never erased) before
// switching class. FLOW-04-09/10 walk every class the main teacher teaches (one test per class); they open each
// chapter's topic list, so they leave each class on its last chapter's first topic.

const { test, expect } = require('../../fixtures');
const {
  TEACHER_CLASSES,
  classLabel,
  squash,
  whereAmI,
  boardStrokes,
  openSecondDevice,
  writeStroke,
  waitForAutosave,
} = require('./flow-helpers');

// Test or placeholder names a teacher must never see ("Test New Chapter Added", "Testing - New Topic Added", "dddd").
const PLACEHOLDER =
  /\btest(ing)?\s*-?\s*new\b|\bnew (chapter|topic) added\b|\bdummy\b|\bplaceholder\b|\blorem\b|\b(\w)\3{3,}\b/i;
const chapterNumber = (name) => Number((squash(name).match(/^(?:chapter\s*)?0*(\d+)/i) || [])[1]);
const topicChapterNumber = (name) =>
  Number(
    (squash(name)
      .replace(/^article\s*/i, '')
      .match(/^(\d+)\.\d+/) || [])[1]
  );

/** Subject names the class chooser offers for a grade and division. Leaves the chooser open. */
const subjectsOf = async (user, grade, division) => {
  const nav = user.nav;
  await nav._openUntil(nav.currentClassBtn, nav.allMyClassesTab);
  await user.page.waitForTimeout(800);
  await nav.allMyClassesTab.click();
  await nav.gradeButton(grade).first().click();
  await user.page.waitForTimeout(400);
  await nav.divisionButton(division).first().click();
  await user.page.waitForTimeout(800);
  return (await nav.subjectButtons.allInnerTexts()).map(squash);
};
const closeClassChooser = async (user) => {
  if (await user.nav.allMyClassesTab.isVisible().catch(() => false)) await user.nav.currentClassBtn.click();
  await user.page.waitForTimeout(600);
};
const chapterNames = async (user) => {
  await user.nav._openUntil(user.nav.currentChapterTopicBtn, user.nav.chapterItems.first());
  await user.page.waitForTimeout(800);
  const names = (await user.nav.chapterItems.allInnerTexts()).map(squash);
  await user.nav._closeChaptersPopupIfOpen();
  return names;
};
/** Open the lesson plan of topic `t` in chapter `c` and return its text (the plan is closed again). */
const lessonPlanText = async (user, c, t) => {
  await user.nav.showTopicsOf(c);
  await user.nav.topicItems.nth(t).locator('[data-qa-id="playlist-tp-lesson-plan-btn"]').click({ force: true });
  await expect(user.nav.lessonPlan, 'the lesson plan opens').toBeVisible({ timeout: 15000 });
  const text = squash(await user.nav.lessonPlan.innerText());
  await user.header.calendar.click({ force: true }); // a tap elsewhere closes it
  await expect(user.nav.lessonPlan).toBeHidden({ timeout: 5000 });
  await user.nav._closeChaptersPopupIfOpen();
  return text;
};

test.describe('FLOW-04 Getting to the lesson', () => {
  test.describe.configure({ timeout: 240000 });

  test(
    "FLOW-04-01: changing the class shows that class's subjects and chapters",
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const s10 = await subjectsOf(user, 'Class 10', 'A');
      await closeClassChooser(user);
      const s12 = await subjectsOf(user, 'Class 12', 'A');
      await closeClassChooser(user);
      expect(s10, 'Class 10 A offers its subjects').toContain('Science');
      expect(s12, 'Class 12 A offers its subjects').toContain('Physics');
      expect(s12, 'each class offers its own subject list').not.toEqual(s10);

      await user.nav.resetToClass('Class 10', 'A', 'Science');
      const c10 = await chapterNames(user);
      await user.nav.resetToClass('Class 12', 'A', 'Physics');
      const c12 = await chapterNames(user);
      expect(c10.length, 'Class 10 A Science lists chapters').toBeGreaterThan(0);
      expect(c12.length, 'Class 12 A Physics lists chapters').toBeGreaterThan(0);
      expect(c12, 'the chapters change with the class').not.toEqual(c10);
    }
  );

  test('FLOW-04-02: searching a chapter by name finds it', { tag: ['@functional'] }, async ({ user }) => {
    await user.nav.resetToClass('Class 12', 'A', 'Physics');
    const chapter = (await chapterNames(user))[0];
    const title = chapter.replace(/^Chapter\s*\d+\s*[.:]?\s*/i, '');
    const word = (title.match(/\p{L}{4,}/u) || [title.slice(0, 4)])[0];
    await user.nav._openUntil(user.nav.currentChapterTopicBtn, user.nav.chapterItems.first());
    await expect(async () => {
      if (!(await user.nav.chapterTpSearchInput.isVisible()))
        await user.nav.chapterTpSearchToggle.click({ force: true });
      await expect(user.nav.chapterTpSearchInput).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 20000 });
    await user.nav.searchContents(word);
    const results = (await user.nav.topicItems.allInnerTexts()).map(squash);
    try {
      expect(results.length, `"${word}" finds something`).toBeGreaterThan(0);
      expect(
        results.some((r) => r.toLowerCase().includes(title.toLowerCase().slice(0, 20))),
        `the chapter "${title}" is found`
      ).toBe(true);
    } finally {
      await user.nav.chapterTpSearchCancel.click({ timeout: 5000 }).catch(() => {});
      await user.nav._closeChaptersPopupIfOpen();
    }
  });

  test(
    'FLOW-04-03: choosing a topic opens its board, playlist and lesson plan',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await user.nav.showTopicsOf(3);
      const topic = user.nav.topicItems.nth(1);
      const name = squash(await topic.innerText()).replace(/^article\s*/i, '');
      await topic.click();
      await user.nav._closeChaptersPopupIfOpen();
      const short = name.replace(/^\d+(\.\d+)?\s*\|?\s*/, '').slice(0, 20);
      await expect(user.nav.currentChapterTopicBtn, 'the chosen topic is current').toContainText(short, {
        timeout: 15000,
      });
      await expect(user.toolbar.wbSvg, 'its board').toBeVisible();
      await user.playlist.ensureDrawerVisible();
      await expect(user.playlist.contentsTile, 'its playlist').toBeVisible();
      expect(await lessonPlanText(user, 3, 1), 'its lesson plan').toContain(short);
    }
  );

  test(
    'FLOW-04-04: the board, playlist and lesson plan change together when the topic changes',
    { tag: ['@functional'] },
    async ({ user }) => {
      // Topic A: Class 9A Science 4.1 (default); topic B: 3.1. Both boards hold earlier writing.
      const read = async (c, t) => {
        await user.nav.goToChapterTopic(c, t);
        await user.playlist.ensureDrawerVisible();
        await user.toolbar.waitForBoardToSettle();
        return {
          board: (await boardStrokes(user)).sort(),
          playlist: await user.playlist.cardTitles(),
          plan: await lessonPlanText(user, c, t),
        };
      };
      const a = await read(3, 0);
      const b = await read(2, 0);
      expect(b.plan, 'the lesson plan changed with the topic').not.toBe(a.plan);
      expect(b.playlist, 'the playlist changed with the topic').not.toEqual(a.playlist);
      if (a.board.length || b.board.length) expect(b.board, 'the board changed with the topic').not.toEqual(a.board);
      const back = await read(3, 0);
      expect(back.board, 'topic A’s own board is back').toEqual(a.board);
      expect(back.playlist, 'topic A’s own playlist is back').toEqual(a.playlist);
    }
  );

  test(
    'FLOW-04-05: signing out and in again opens the last topic',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await user.nav.goToChapterTopic(2, 0);
      const left = await whereAmI(user);
      await user.userMenu.signOut();
      await page.waitForTimeout(2000);
      await user.signIn();
      await expect(user.nav.currentClassBtn, 'the last class').toHaveText(left.cls, { timeout: 30000 });
      expect((await whereAmI(user)).topic, 'the last topic').toBe(left.topic);
    }
  );

  test(
    'FLOW-04-06: the last topic is restored when the teacher signs in on another device',
    { tag: ['@functional'] },
    async ({ user }) => {
      await user.nav.goToChapterTopic(2, 0);
      await user.page.waitForTimeout(3000); // let the choice reach the server
      const left = await whereAmI(user);
      const second = await openSecondDevice(process.env.VALID_PIN);
      try {
        await expect(second.app.nav.currentClassBtn, 'the same class on the other device').toHaveText(left.cls, {
          timeout: 30000,
        });
        expect((await whereAmI(second.app)).topic, 'the same topic on the other device').toBe(left.topic);
      } finally {
        await second.close();
      }
    }
  );

  test(
    'FLOW-04-07: switching class fast several times ends on the last chosen class with its own board',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      await user.toolbar.waitForBoardToSettle();
      const own = await whereAmI(user); // the default class, Class 9A Science
      const ownBoard = (await boardStrokes(user)).sort();
      const order = [
        ['Class 10', 'A', 'Science'],
        ['Class 12', 'A', 'Physics'],
        ['Class 10', 'A', 'Science'],
        ['Class 12', 'A', 'Physics'],
        ['Class 9', 'A', 'Science'],
      ];
      for (const [g, d, s] of order) {
        await user.nav.openClassPopup().catch(() => {});
        await page.waitForTimeout(400);
        await user.nav.allMyClassesTab.click({ timeout: 5000 }).catch(() => {});
        await user.nav
          .gradeButton(g)
          .first()
          .click({ timeout: 5000 })
          .catch(() => {});
        await user.nav
          .divisionButton(d)
          .first()
          .click({ timeout: 5000 })
          .catch(() => {});
        await user.nav
          .subjectButton(s)
          .first()
          .click({ timeout: 5000 })
          .catch(() => {});
      }
      await expect(user.nav.currentClassBtn, 'ends on the last class chosen').toHaveText(own.cls, { timeout: 30000 });
      await page.waitForTimeout(5000);
      await expect(user.nav.currentClassBtn, 'and stays there').toHaveText(own.cls);
      expect((await whereAmI(user)).topic, 'on its own topic').toBe(own.topic);
      await user.toolbar.waitForBoardToSettle();
      expect((await boardStrokes(user)).sort(), 'with its own board').toEqual(ownBoard);
    }
  );

  test.describe('switching class with something open', () => {
    test.use({ freshSpace: true });

    /** Write a stroke, open `what`, switch class, check the panel is gone, come back and find the stroke. */
    const switchWithOpen = async (user, open, panel) => {
      const stroke = await writeStroke(user);
      await waitForAutosave(user);
      await open();
      await user.nav.resetToClass('Class 10', 'A', 'Science');
      await expect(panel, 'the old panel is not left open').toBeHidden({ timeout: 10000 });
      await user.nav.applyClassMap('default');
      await user.toolbar.waitForBoardToSettle();
      expect(await boardStrokes(user), 'no writing lost').toContain(stroke);
    };

    test(
      'FLOW-04-08: switching class while a player is open does not lose work or leave the old panel open',
      { tag: ['@negative'] },
      async ({ user }) => {
        await user.playlist.ensureDrawerVisible();
        const cards = user.playlist.resourceCards;
        expect(await cards.count(), 'set-up: a resource in the default topic').toBeGreaterThan(0);
        await switchWithOpen(
          user,
          async () => {
            await user.player.openResourceCard(cards.first());
            expect(await user.player.isPlayerOpen(20000), 'set-up: the player opened').toBe(true);
          },
          user.player.closeIcon.first()
        );
      }
    );

    test(
      'FLOW-04-08: switching class while a notice is open does not lose work or leave the old panel open',
      { tag: ['@negative'] },
      async ({ user }) => {
        await switchWithOpen(
          user,
          async () => {
            await user.aiNotices.openComposer(user, 'Sports day is on Friday');
            await user.aiNotices.hideKeyboard();
          },
          user.aiNotices.titleInput
        );
      }
    );

    test(
      'FLOW-04-08: switching class while the recorder is open does not lose work or leave the old panel open',
      { tag: ['@negative'] },
      async ({ user }) => {
        await switchWithOpen(user, () => user.learningShorts.openRecorder(user.magnet), user.learningShorts.exitBtn);
      }
    );
  });

  test.describe('every class the teacher teaches', () => {
    test.describe.configure({ timeout: 15 * 60 * 1000 });

    for (const [g, d, s] of TEACHER_CLASSES) {
      test(
        `FLOW-04-09: ${classLabel(g, d, s)} lists its chapters in order, with topic numbers that match the chapter`,
        { tag: ['@functional'] },
        async ({ user }) => {
          await user.nav.resetToClass(g, d, s);
          const chapters = await chapterNames(user);
          expect(chapters.length, 'chapters listed').toBeGreaterThan(0);
          const numbers = chapters.map(chapterNumber).filter((n) => !Number.isNaN(n));
          expect(numbers, 'chapters listed in order').toEqual([...numbers].sort((a, b) => a - b));
          const wrong = [];
          for (let c = 0; c < chapters.length; c++) {
            const n = chapterNumber(chapters[c]);
            if (Number.isNaN(n)) continue;
            await user.nav.showTopicsOf(c);
            for (const topic of (await user.nav.topicItems.allInnerTexts()).map(squash)) {
              const tn = topicChapterNumber(topic);
              if (!Number.isNaN(tn) && tn !== n) wrong.push(`${chapters[c]} -> ${topic}`);
            }
            await user.nav._closeChaptersPopupIfOpen();
          }
          expect(wrong, 'every topic number starts with its chapter’s number').toEqual([]);
        }
      );
    }

    for (const [g, d, s] of TEACHER_CLASSES) {
      test(
        `FLOW-04-10: ${classLabel(g, d, s)} shows no test or placeholder chapters and topics`,
        { tag: ['@negative'] },
        async ({ user }) => {
          await user.nav.resetToClass(g, d, s);
          const chapters = await chapterNames(user);
          const found = chapters.filter((c) => PLACEHOLDER.test(c.replace(/^(chapter\s*)?\d+\s*[.:]?\s*/i, '')));
          for (let c = 0; c < chapters.length; c++) {
            await user.nav.showTopicsOf(c);
            for (const topic of (await user.nav.topicItems.allInnerTexts()).map(squash))
              if (PLACEHOLDER.test(topic.replace(/^(article\s*)?\d+(\.\d+)?\s*\|?\s*/i, ''))) found.push(topic);
            await user.nav._closeChaptersPopupIfOpen();
          }
          expect(found, 'no test or placeholder content shown to teachers').toEqual([]);
        }
      );
    }
  });
});
