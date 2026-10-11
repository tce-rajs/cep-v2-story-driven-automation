// XC-03 — Different teachers and school data
// Source: CEPV2_Stories/20_CrossCutting.md
// Runs in the desktop client, read only: classes, chapters and topics are only opened and read; the one stroke of
// XC-03-02 goes on fresh space. XC-03-01 compares a class where the account is the class teacher ('attendance',
// 10A Science) with one where it is not ('attendanceReadOnly', the second account in 9A Science: its register opens
// read only). XC-03-02 needs an account with exactly one class (ONE_CLASS_PIN in .env).

const { test, expect } = require('../../fixtures');
const { pinForModule } = require('../../config/moduleClassMap');
const { TEACHER_CLASSES, findTopicWhere } = require('../00-flows/flow-helpers');

const squash = (t) =>
  String(t || '')
    .replace(/\s+/g, ' ')
    .trim();

/** Every class / subject the signed-in teacher has, from All My Classes: [{ grade, division, subject }]. */
async function allMyClasses(app) {
  const nav = app.nav;
  await nav._openUntil(nav.currentClassBtn, nav.allMyClassesTab);
  await app.page.waitForTimeout(800);
  await nav.allMyClassesTab.click({ timeout: 5000 });
  const out = [];
  for (const grade of (await nav.gradeButtons.allInnerTexts()).map(squash)) {
    await nav.gradeButton(grade).first().click({ timeout: 5000 });
    await app.page.waitForTimeout(400);
    for (const division of (await nav.divisionButtons.allInnerTexts()).map(squash)) {
      await nav.divisionButton(division).first().click({ timeout: 5000 });
      await app.page.waitForTimeout(400);
      for (const subject of (await nav.subjectButtons.allInnerTexts()).map(squash))
        out.push({ grade, division, subject });
    }
  }
  await nav.currentClassBtn.click({ force: true }).catch(() => {});
  await nav.allMyClassesTab.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  return out;
}

/** Elements whose text is cut off without an ellipsis or runs outside the box holding it. */
const overflowing = (locator) =>
  locator.evaluateAll((els) =>
    els
      .filter((el) => el.getBoundingClientRect().width > 0)
      .flatMap((el) => {
        const out = [];
        const box = el.getBoundingClientRect();
        for (const e of [el, ...el.querySelectorAll('*')]) {
          if (!e.textContent.trim() || e.children.length) continue;
          const cs = getComputedStyle(e);
          const r = e.getBoundingClientRect();
          const clipped =
            e.scrollWidth > e.clientWidth + 1 && cs.textOverflow !== 'ellipsis' && cs.overflow !== 'visible';
          const outside = r.right > box.right + 2 || r.left < box.left - 2;
          if (clipped || outside)
            out.push(`${e.textContent.trim().slice(0, 50)}${clipped ? ' (cut off)' : ' (outside its box)'}`);
        }
        return out;
      })
  );

// Names that are clearly test or junk entries ("dddd", "test", "Testing - New Topic Added"), not real lessons.
const JUNK = /^(d{3,}|tests?|testing|asdf\w*|dummy|sample(?: topic)?|xyz+|abc+|(\w)\2{3,})$|new topic added/i;

test.describe('XC-03 Different teachers and school data', () => {
  test.describe.configure({ timeout: 600000 });

  test(
    'XC-03-01: Attendance appears in Magnet only for classes where the teacher is the class teacher',
    { tag: ['@functional'] },
    async ({ app, page }) => {
      const seen = {};
      for (const key of ['attendance', 'attendanceReadOnly']) {
        if (await app.login.avatar.isVisible().catch(() => false)) await app.userMenu.signOut();
        await app.signIn(pinForModule(key));
        await app.nav.applyClassMap(key);
        await app.magnet.open();
        const listed = await app.magnet.attendanceItem.isVisible({ timeout: 5000 }).catch(() => false);
        await page.keyboard.press('Escape');
        let classTeacher = null;
        if (listed) {
          await app.attendance.open(app.magnet);
          await app.attendance.startMarking().catch(() => {});
          // Only the class teacher can mark: the register opens read only for anyone else.
          classTeacher = !(await app.attendance.isDisabled(app.attendance.markAllPresentBtn.filter({ visible: true })));
          await app.attendance.closeAll();
        }
        seen[key] = { listed, classTeacher };
      }
      test.info().annotations.push({ type: 'note', description: JSON.stringify(seen) });
      expect(seen.attendance.listed, 'listed where the teacher is the class teacher').toBe(true);
      expect(
        Object.entries(seen)
          .filter(([, s]) => s.listed && s.classTeacher === false)
          .map(([k]) => k),
        'not listed where the teacher is not the class teacher'
      ).toEqual([]);
    }
  );

  test(
    'XC-03-02: a teacher with one class can switch topics and use every feature',
    { tag: ['@functional'] },
    async ({ app }) => {
      if (!process.env.ONE_CLASS_PIN)
        throw new Error('DATA MISSING ON THIS SERVER: no account with exactly one class (set ONE_CLASS_PIN in .env)');
      await app.signIn(process.env.ONE_CLASS_PIN);
      const classes = await allMyClasses(app);
      expect(classes, 'set-up: the account has exactly one class').toHaveLength(1);
      await app.nav.goToChapterTopic(0, 1);
      await expect.soft(app.nav.currentChapterTopicBtn, 'switches topic').toHaveText(/^\s*1\.2\s/, { timeout: 30000 });
      await app.content.startOnFreshSpace();
      const before = await app.toolbar.pathCount();
      await app.toolbar.penStroke({ x: 520, y: 420 }, { x: 760, y: 480 });
      expect.soft(await app.toolbar.pathCount(), 'writes').toBe(before + 1);
      await app.playlist.ensureDrawerVisible();
      await app.playlist.ensureResourcesPresent();
      await app.player.openResourceCard(app.playlist.resourceCards);
      expect.soft(await app.player.isPlayerOpen(20000), 'opens a resource').toBe(true);
      await app.player.closePlayer();
      await app.magnet.open();
      await expect.soft(app.magnet.noticeItem, 'has the Magnet tools').toBeVisible({ timeout: 8000 });
      await app.page.keyboard.press('Escape');
    }
  );

  test(
    'XC-03-03: a teacher with 10+ classes and subjects gets a usable class window and quick switching',
    { tag: ['@performance'] },
    async ({ user }) => {
      const t0 = Date.now();
      const classes = await allMyClasses(user);
      const windowMs = Date.now() - t0;
      if (classes.length < 10)
        throw new Error(
          `DATA MISSING ON THIS SERVER: the main teacher has ${classes.length} classes and subjects, not 10+`
        );
      const switches = [];
      for (const c of [classes[0], classes[classes.length - 1], classes[Math.floor(classes.length / 2)]]) {
        const s0 = Date.now();
        await user.nav.resetToClass(c.grade, c.division, c.subject);
        switches.push(Date.now() - s0);
      }
      test.info().annotations.push({
        type: 'note',
        description: `${classes.length} classes and subjects; reading them all ${windowMs} ms; switches ${switches.join(', ')} ms.`,
      });
      expect(Math.max(...switches), 'each switch is quick (under 15 s)').toBeLessThan(15000);
      await user.nav.applyClassMap('default');
    }
  );

  test(
    'XC-03-04: a subject with no chapters, and a topic with no resources, show clear empty messages',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const empty = /no (chapters?|topics?|resources?|content|data)|nothing (here|to show)|not available|empty/i;
      const found = { subject: null, topic: null };
      for (const [grade, division, subject] of TEACHER_CLASSES) {
        await user.nav.resetToClass(grade, division, subject);
        await user.nav.openChaptersPopup();
        await page.waitForTimeout(1500);
        const chapters = await user.nav.chapterItems.count();
        if (!chapters && !found.subject) {
          found.subject = `${grade} ${division} ${subject}`;
          await expect
            .soft(user.nav.chapterTpPopup.getByText(empty).first(), `${found.subject}: a clear "no chapters" message`)
            .toBeVisible();
        }
        await user.nav._closeChaptersPopupIfOpen();
        if (!found.topic && chapters) {
          const hit = await findTopicWhere(user, async () => (await user.playlist.resourceCards.count()) === 0, {
            chapters: 3,
            topics: 3,
          });
          if (hit) {
            found.topic = `${grade} ${division} ${subject} ${squash(await user.nav.currentChapterTopicBtn.innerText())}`;
            await expect
              .soft(
                page.getByText(empty).filter({ visible: true }).first(),
                `${found.topic}: a clear "no resources" message`
              )
              .toBeVisible();
          }
        }
        if (found.subject && found.topic) break;
      }
      await user.nav.applyClassMap('default');
      test.info().annotations.push({ type: 'note', description: JSON.stringify(found) });
      const missing = Object.keys(found).filter((k) => !found[k]);
      if (missing.length)
        throw new Error(
          `DATA MISSING ON THIS SERVER: no ${missing.join(' / ')} without content in the teacher's classes`
        );
    }
  );

  test(
    'XC-03-05: very long chapter, topic and resource names are shortened neatly everywhere they appear',
    { tag: ['@edge'] },
    async ({ user }) => {
      // 9A Hindi Language: 29 chapters with the longest names; its topics and Playlist cards.
      await user.nav.applyClassMap('navigationBoundary');
      await user.playlist.ensureDrawerVisible();
      const problems = {};
      problems['class / topic bar'] = await overflowing(user.nav.currentClassBtn.or(user.nav.currentChapterTopicBtn));
      problems['Playlist cards'] = await overflowing(user.playlist.resourceCards);
      await user.nav.openChaptersPopup();
      await user.nav.chapterItems.first().waitFor({ state: 'visible', timeout: 10000 });
      problems.chapters = await overflowing(user.nav.chapterItems);
      problems.topics = await overflowing(user.nav.topicItems);
      await user.nav._closeChaptersPopupIfOpen();
      for (const [where, list] of Object.entries(problems))
        expect.soft(list, `${where}: names shortened neatly`).toEqual([]);
    }
  );

  test(
    'XC-03-06: test or junk topics in the curriculum are reported to content owners',
    { tag: ['@functional'] },
    async ({ user }) => {
      // Every chapter name, and every topic the contents search finds for the usual junk words, in each class.
      const junk = [];
      for (const [grade, division, subject] of TEACHER_CLASSES) {
        await user.nav.resetToClass(grade, division, subject);
        await user.nav.openChaptersPopup();
        await user.nav.chapterItems
          .first()
          .waitFor({ state: 'visible', timeout: 10000 })
          .catch(() => {});
        for (const name of (await user.nav.chapterItems.allInnerTexts()).map(squash))
          if (JUNK.test(name.replace(/^\d+[.)]?\s*/, '')))
            junk.push(`${grade} ${division} ${subject}: chapter "${name}"`);
        for (const word of ['test', 'dddd', 'dummy', 'sample', 'asdf']) {
          if (!(await user.nav.chapterTpSearchInput.isVisible().catch(() => false)))
            await user.nav.chapterTpSearchToggle.click({ force: true }).catch(() => {});
          await user.nav.searchContents(word).catch(() => {});
          for (const name of (await user.nav.topicItems.allInnerTexts()).map(squash))
            if (JUNK.test(name.replace(/^\d+(\.\d+)*\s*/, '')) || /new topic added/i.test(name))
              junk.push(`${grade} ${division} ${subject}: topic "${name}"`);
          await user.nav.chapterTpSearchCancel.click({ force: true }).catch(() => {});
        }
        await user.nav._closeChaptersPopupIfOpen();
      }
      await user.nav.applyClassMap('default');
      expect(
        [...new Set(junk)],
        'no test or junk topics in the curriculum (report any found to the content owners)'
      ).toEqual([]);
    }
  );
});
