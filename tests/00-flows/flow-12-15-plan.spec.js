// FLOW-12 — Planning a quiz in Plan Mode and using it in class
// FLOW-13 — A Revision Test or Checkpoint with the class
// FLOW-14 — Content Library and Code Editor in Plan Mode
// FLOW-15 — Reports: what happened in class reaches the principal and the admin
// Source: CEPV2_Stories/00_EndToEndFlows.md
//
// These flows run in the browser (RUN_IN_BROWSER=1): Plan Mode, the student test site, the principal's reports and the
// Admin panel are web pages.
// - FLOW-12 and FLOW-14: the Plan Mode account (PLAN_PIN) on Class 12 Physics 1.1. Everything made is titled
//   "AutoTest …" and removed again (the question, the quiz, the resource, the saved code).
// - FLOW-13: the main account on 10A Science 3.4 ('compassRevisionTest'). FLOW-13-01 makes a fresh Revision Test for the
//   run (fresh-revision-test.js), so every 10A student can still sign in to it; FLOW-13-08 (paper) and FLOW-13-11 (time
//   runs out) make their own. Revision Tests cannot be deleted in the app, so each run leaves these "AutoTest …" tests
//   in the topic; a test started here is always ended again (afterAll ends any left running).
//   Students join with their grade, class and roll number: the site has no separate join code.
// - FLOW-15: the principal (PRINCIPAL_PIN) and the Admin panel (ADMIN_* in .env), read only. FLOW-15-01/02 read the
//   report of the FLOW-13 test and its students (shared through a small file).

const fs = require('fs');
const os = require('os');
const path = require('path');
const XLSX = require('xlsx');
const { test, expect } = require('../../fixtures');
const { BASE_URL } = require('../../config/env');
const { App } = require('../../pages/app');
const { PNG_FILE } = require('../../pages/add-resource.page');
const { getClassMap } = require('../../config/moduleClassMap');
const {
  openPlanMode,
  startQuiz,
  quizCardInTeach,
  removeQuiz,
  autoName,
  autoTitle,
  QUIZ_CLASS,
} = require('../10-plan-mode/plan-helpers');
const { startCheckpoint, endCheckpoint, rosterCounts, openStudentSite } = require('../21-checkpoints/chk-helpers');
const { createFreshRevisionTest, openRevisionTestCard } = require('../21-checkpoints/fresh-revision-test');

const BROWSER_ONLY = 'Plan Mode, tests and reports are checked in the browser: run with RUN_IN_BROWSER=1';
const RT_CLASS = getClassMap('compassRevisionTest');
const GRADE = RT_CLASS.grade;
const DIVISION = `Division ${RT_CLASS.division}`;
const flat = (t) => String(t || '').replace(/\s+/g, ' ');

// Shared between the tests of a flow (a later test still has it if an earlier one fails).
const stateFile = (name) => path.join(os.tmpdir(), `flow-${name}.json`);
const readState = (name) =>
  fs.existsSync(stateFile(name)) ? JSON.parse(fs.readFileSync(stateFile(name), 'utf8')) : {};
const writeState = (name, patch) =>
  fs.writeFileSync(stateFile(name), JSON.stringify({ ...readState(name), ...patch }, null, 2));

// ---------------------------------------------------------------------------------------------------------------------
// FLOW-12
// ---------------------------------------------------------------------------------------------------------------------

test.describe('FLOW-12 Planning a quiz in Plan Mode and using it in class', () => {
  test.skip(!process.env.RUN_IN_BROWSER, BROWSER_ONLY);
  test.describe.configure({ timeout: 240000 });
  const F = '12';
  const OPTIONS = ['Alpha', 'Beta', 'Gamma', 'Delta'];

  test.beforeEach(async ({ app }) => {
    await openPlanMode(app);
  });

  // Whatever FLOW-12 left behind (the question, the quiz) is removed again.
  test.afterAll(async ({ browser }) => {
    const { question, quiz } = readState(F);
    if (!question && !quiz) return;
    const context = await browser.newContext({ baseURL: BASE_URL });
    const app = new App(await context.newPage());
    try {
      await openPlanMode(app);
      if (question) {
        await app.plan.openSection('Question Bank');
        if (await app.plan.questionCardByText(question).count()) await app.plan.deleteQuestion(question);
      }
      if (quiz) await removeQuiz(app, quiz);
    } catch {
      // Best effort: the next run's FLOW-12-03 makes a new question with a new name.
    } finally {
      await context.close();
    }
  });

  test(
    'FLOW-12-01: switching to Plan Mode opens planning for the same class and topic',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      fs.rmSync(stateFile(F), { force: true });
      await app.plan.openSection('Question Bank');
      await expect(app.plan.classSubjectHeading, 'the same class and subject').toContainText(
        new RegExp(`${QUIZ_CLASS.grade}\\s*\\|\\s*${QUIZ_CLASS.subject}`)
      );
      const chapter = await app.plan.chapterSelect.evaluate((s) => s.options[s.selectedIndex].text);
      const topic = await app.plan.topicSelect.evaluate((s) => s.options[s.selectedIndex].text);
      expect(chapter, 'the same chapter (Teach Mode 1.x)').toMatch(/^Chapter 1\./);
      expect(topic, 'the same topic (Teach Mode 1.1)').toMatch(/^1\.\s/);
    }
  );

  test(
    "FLOW-12-02: the Question Bank lists the topic's questions and can be filtered",
    { tag: ['@functional'] },
    async ({ app }) => {
      await app.plan.openSection('Question Bank');
      await expect(app.plan.questionCards.first(), 'the topic lists questions').toBeVisible({ timeout: 15000 });
      const before = (await app.plan.questionCards.allInnerTexts()).join('|');
      const topics = await app.plan.optionsOf(app.plan.topicSelect);
      await app.plan.choose(app.plan.topicSelect, topics[2]);
      const after = (await app.plan.questionCards.allInnerTexts()).join('|');
      expect(after, `another topic (${topics[2]}) lists other questions`).not.toBe(before);
    }
  );

  test(
    'FLOW-12-03: a new question created by the teacher is saved in the Question Bank',
    { tag: ['@functional'] },
    async ({ app }) => {
      const question = autoName('flow question');
      await app.plan.openSection('Question Bank');
      await app.plan.openCreateQuestion();
      await app.plan.fillQuestion({ text: question, options: OPTIONS, correct: 0 });
      const saved = await app.plan.submitQuestion();
      expect(saved && saved.ok(), 'the question is saved').toBe(true);
      writeState(F, { question });
      await app.page.reload();
      await app.page.waitForTimeout(5000);
      await app.plan.openSection('Question Bank');
      await expect(app.plan.questionCardByText(question), 'it is in the bank').toHaveCount(1, { timeout: 15000 });
    }
  );

  test(
    'FLOW-12-04: a quiz made from chosen questions is saved in the topic',
    { tag: ['@functional'] },
    async ({ app, page }) => {
      const { question } = readState(F);
      test.skip(!question, 'Needs the question of FLOW-12-03');
      const quiz = autoTitle();
      await startQuiz(app, 0);
      // Tick the teacher's own question. Its checkbox sits beside .question-card, in the card view around both.
      const card = page.locator('tce-qb-question-card-view').filter({ hasText: question }).first();
      await card.scrollIntoViewIfNeeded();
      await card.locator('input[type=checkbox]').first().click({ force: true });
      expect(await app.plan.quizCount(), 'one question chosen').toBe(1);
      await app.plan.pressQuizBar();
      await app.plan.quizTitleInput.fill(quiz);
      const created = page.waitForResponse((r) => r.request().method() === 'POST' && /custom\/quiz/i.test(r.url()), {
        timeout: 20000,
      });
      await app.plan.addQuizBtn.click();
      const r = await created;
      writeState(F, { quiz });
      expect(r.ok(), `the quiz is saved in the topic (HTTP ${r.status()})`).toBe(true);
    }
  );

  test(
    'FLOW-12-05: switching back to Teach Mode shows the new quiz in the playlist',
    { tag: ['@functional'] },
    async ({ app }) => {
      const { quiz } = readState(F);
      test.skip(!quiz, 'Needs the quiz of FLOW-12-04');
      const card = await quizCardInTeach(app, quiz);
      await expect(card, 'the quiz is in the topic Playlist').toHaveCount(1, { timeout: 20000 });
    }
  );

  test('FLOW-12-06: the class can attempt the new quiz', { tag: ['@functional'] }, async ({ app }) => {
    const { quiz } = readState(F);
    test.skip(!quiz, 'Needs the quiz of FLOW-12-04');
    const card = await quizCardInTeach(app, quiz);
    await expect(card, 'set-up: the quiz is in the Playlist').toHaveCount(1, { timeout: 20000 });
    try {
      await app.player.openResourceCard(card);
      await expect(app.player.quizOptions.first(), 'the question shows its answers').toBeVisible({ timeout: 30000 });
      expect(await app.player.quizOptions.count(), 'the four answers').toBe(OPTIONS.length);
      await app.player.answerCurrentQuestion(0);
      await expect(
        app.player.quizCorrectOptions.first(),
        'the answer is submitted and the right one is marked'
      ).toBeVisible({ timeout: 10000 });
    } finally {
      await app.player.closePlayer().catch(() => {});
    }
  });

  test('FLOW-12-07: a quiz with no questions cannot be saved', { tag: ['@negative'] }, async ({ app, page }) => {
    const posts = [];
    page.on('request', (r) => r.method() === 'POST' && /custom\/quiz/i.test(r.url()) && posts.push(r.url()));
    await startQuiz(app, 0);
    expect(await app.plan.quizCount(), 'set-up: nothing ticked').toBe(0);
    await app.plan.pressQuizBar();
    if (await app.plan.quizTitleInput.isVisible()) {
      await app.plan.quizTitleInput.fill(autoTitle());
      await app.plan.addQuizBtn.click({ force: true });
      await page.waitForTimeout(3000);
    }
    expect(posts, 'no quiz without questions is saved').toEqual([]);
  });

  test(
    'FLOW-12-08: the quiz can be removed and is then gone from Teach Mode',
    { tag: ['@functional'] },
    async ({ app, page }) => {
      const { quiz } = readState(F);
      test.skip(!quiz, 'Needs the quiz of FLOW-12-04');
      await removeQuiz(app, quiz);
      await page.reload();
      await app.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
      const card = await quizCardInTeach(app, quiz);
      await expect(card, 'the quiz is gone').toHaveCount(0, { timeout: 15000 });
      writeState(F, { quiz: null });
    }
  );
});

// ---------------------------------------------------------------------------------------------------------------------
// FLOW-13
// ---------------------------------------------------------------------------------------------------------------------

/** The marks the student site recorded for one answer (from its ATTEMPT request). */
const marksOf = (response) => {
  const event = JSON.parse(response.request().postData() || '{}');
  return Number(JSON.parse(event.answerMetadata || '{}').marksObtained) || 0;
};

/** Record every answer a student page sends: questionId -> marks (the last answer of a question counts). */
const recordMarks = (page) => {
  const marks = new Map();
  page.on('request', (r) => {
    const body = r.postData() || '';
    if (!/client\/attempts/.test(r.url()) || !/"ATTEMPT"/.test(body)) return;
    const event = JSON.parse(body);
    marks.set(event.questionId, Number(JSON.parse(event.answerMetadata || '{}').marksObtained) || 0);
  });
  return marks;
};

/** Answer the current question right, trying the options until the site records marks for one. */
const answerRight = async (student) => {
  const options = await student.answerOptions.count();
  for (let o = 0; o < options; o++) if (marksOf(await student.answer(o)) > 0) return;
};

/** The score line of the result screen: { got, outOf } or null. */
const scoreOf = (shown) => {
  const m = flat(shown).match(/Score:\s*(\d+)\s*\/\s*(\d+)/);
  return m ? { got: Number(m[1]), outOf: Number(m[2]) } : null;
};

const F13 = '13';
const nextRoll = () => Math.max(1, ...(readState(F13).students || []).map((s) => s.roll + 1));
const saveStudent = (s) =>
  writeState(F13, {
    students: (readState(F13).students || []).filter((x) => x.roll !== s.roll).concat(s),
  });

/** A student answers every question with `pick(i)` (an option index, or 'right'), ends, and is scored. */
const takeWholeTest = async (browser, pick) => {
  const { context, student } = await openStudentSite(browser);
  try {
    const marks = recordMarks(student.page);
    await student.chooseClass(GRADE, DIVISION);
    const who = await student.signInNextStudent(GRADE, DIVISION, nextRoll());
    await student.startMission();
    let total = 0;
    for (let i = 0; i < 50; i++) {
      total++;
      const p = pick(i);
      if (p === 'right') await answerRight(student);
      else if (p !== null) await student.answer(p);
      if (!(await student.nextQuestionBtn.isVisible())) break;
      await student.nextQuestionBtn.click();
      await student.page.waitForTimeout(800);
    }
    await student.endMission();
    await expect(student.resultScore, 'the result screen').toBeVisible({ timeout: 30000 });
    const shown = flat(await student.resultScore.innerText());
    return { ...who, total, expected: [...marks.values()].reduce((a, b) => a + b, 0), shown };
  } finally {
    await context.close();
  }
};

/** Principal: Assessment for Learning -> Revision, on 10A Science, the assessment titled `title`; the page text. */
const principalRevisionReport = async (app, title) => {
  await app.plan.openReport('Assessment for Learning');
  await app.plan.aflRevisionBtn.click();
  await app.page.waitForTimeout(2500);
  await app.plan.aflGradeSelect.selectOption({ label: GRADE });
  await app.page.waitForTimeout(2500);
  await app.plan.aflClassSelect.selectOption({ label: DIVISION });
  await app.page.waitForTimeout(2500);
  await app.plan.aflSubjectSelect.selectOption({ label: RT_CLASS.subject });
  await app.page.waitForTimeout(3000);
  const options = await app.plan.optionsOf(app.plan.aflAssessmentSelect);
  if (!options.includes(title)) return { listed: false, text: '' };
  await app.plan.aflAssessmentSelect.selectOption({ label: title });
  await app.page.waitForTimeout(5000);
  // Open every band group so every student row is on the page.
  for (const band of ['Developing', 'Proficient', 'Advanced'])
    await app.page
      .getByText(new RegExp(`^\\s*${band}\\s*$`))
      .first()
      .click({ force: true, timeout: 3000 })
      .catch(() => {});
  await app.page.waitForTimeout(1500);
  return { listed: true, text: flat(await app.page.locator('body').innerText()) };
};

/** The percentage the principal's report shows for a student, or null. */
const reportPercent = (text, name) => {
  const m = text.match(new RegExp(`${name}[^%]{0,60}?(\\d+)%`));
  return m ? Number(m[1]) : null;
};

/**
 * Sign in as the principal and read the FLOW-13 test's Revision report until every student is listed (the report can
 * take 10–30 minutes to show a test; checked every 2 minutes for 30 minutes, as CHK-13 does). Returns the page text,
 * or '' if the students never appeared.
 */
const readPrincipalReportFor = async (app, title, students) => {
  await app.guest.open();
  await app.signIn(process.env.PRINCIPAL_PIN);
  await app.compass.switchToPlanningMode();
  await app.page.waitForTimeout(5000);
  let text = '';
  for (let attempt = 0; attempt < 15; attempt++) {
    if (attempt) {
      await app.page.waitForTimeout(120000);
      await app.page.reload();
      await app.page.waitForTimeout(5000);
    }
    const r = await principalRevisionReport(app, title).catch(() => ({ listed: false, text: '' }));
    text = r.text;
    if (r.listed && students.every((s) => reportPercent(text, s.name) !== null)) return text;
  }
  return text;
};

test.describe('FLOW-13 A Revision Test or Checkpoint with the class', () => {
  test.skip(!process.env.RUN_IN_BROWSER, BROWSER_ONLY);
  test.use({ classMap: 'compassRevisionTest' });
  test.describe.configure({ timeout: 360000 });

  // A test started by this flow is never left running: end any that still is.
  test.afterAll(async ({ browser }) => {
    const started = readState(F13).started || [];
    if (!started.length) return;
    const context = await browser.newContext({ baseURL: BASE_URL });
    const app = new App(await context.newPage());
    try {
      await app.guest.open();
      await app.signIn(process.env.VALID_PIN);
      await app.nav.applyClassMap('compassRevisionTest');
      for (const t of started) {
        await openRevisionTestCard(app, t);
        if (await app.player.checkpointEndBtn.isVisible({ timeout: 3000 }).catch(() => false)) await endCheckpoint(app);
        await app.player.checkpointCloseBtn.click({ force: true, timeout: 5000 }).catch(() => {});
      }
      writeState(F13, { started: [] });
    } catch {
      // Reported by the tests themselves; a test left running shows in the next run's set-up.
    } finally {
      await context.close();
    }
  });

  const remember = (t) => writeState(F13, { started: [...(readState(F13).started || []), t] });

  test(
    'FLOW-13-01: a Revision Test created in Plan Mode is ready to launch in Teach Mode',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      fs.rmSync(stateFile(F13), { force: true });
      const rt = await createFreshRevisionTest(user, { prefix: 'AutoTest flow RT' });
      writeState(F13, { test: rt, students: [] });
      await openRevisionTestCard(user, rt);
      await expect(user.player.checkpointModeOnlineBtn, 'it can be launched online (In-Lab Assessment)').toBeVisible();
      await expect(user.player.checkpointModeOfflineBtn, 'or as a paper test').toBeVisible();
    }
  );

  test('FLOW-13-02: launching shows the code students need to join', { tag: ['@functional'] }, async ({ user }) => {
    const rt = readState(F13).test;
    test.skip(!rt, 'Needs the Revision Test of FLOW-13-01');
    await openRevisionTestCard(user, rt);
    await startCheckpoint(user, 'online');
    remember(rt);
    // Students join on the student test site with their grade, class and roll number.
    await expect(
      user.page.getByText(/students now begin the test through the student portal/i).first(),
      'the teacher is told how students join'
    ).toBeVisible({ timeout: 15000 });
  });

  test(
    'FLOW-13-03: a student signs in on the test site with the code and sees the questions',
    { tag: ['@smoke', '@functional'] },
    async ({ browser }) => {
      test.skip(!(readState(F13).started || []).length, 'Needs the test started in FLOW-13-02');
      const { context, student } = await openStudentSite(browser);
      try {
        const marks = recordMarks(student.page);
        await student.chooseClass(GRADE, DIVISION);
        const who = await student.signInNextStudent(GRADE, DIVISION, nextRoll());
        await student.startMission();
        await expect(student.questionText.first(), 'the first question').toBeVisible();
        expect(await student.answerOptions.count(), 'with its answers').toBeGreaterThan(1);
        const total = await student.answerAllAndEnd(0);
        await expect(student.resultScore).toBeVisible({ timeout: 30000 });
        saveStudent({
          ...who,
          total,
          expected: [...marks.values()].reduce((a, b) => a + b, 0),
          shown: flat(await student.resultScore.innerText()),
        });
      } finally {
        await context.close();
      }
    }
  );

  test(
    "FLOW-13-04: the teacher sees each student's progress as they answer",
    { tag: ['@functional'] },
    async ({ user, browser }) => {
      const rt = readState(F13).test;
      test.skip(!(readState(F13).started || []).length, 'Needs the test started in FLOW-13-02');
      await openRevisionTestCard(user, rt);
      const before = await rosterCounts(user);
      expect(before, 'set-up: the roster shows its counts').not.toBeNull();
      const { context, student } = await openStudentSite(browser);
      try {
        const marks = recordMarks(student.page);
        await student.chooseClass(GRADE, DIVISION);
        const who = await student.signInNextStudent(GRADE, DIVISION, nextRoll());
        await student.startMission();
        await student.answer(1);
        await expect
          .poll(async () => (await rosterCounts(user))?.attempting ?? 0, {
            message: `${who.name} shows as Attempting`,
            timeout: 60000,
          })
          .toBeGreaterThan(before.attempting);
        let total = 1;
        while (await student.nextQuestionBtn.isVisible()) {
          await student.nextQuestionBtn.click();
          await student.page.waitForTimeout(800);
          await student.answer(1);
          total++;
        }
        await student.endMission();
        await expect(student.resultScore).toBeVisible({ timeout: 30000 });
        saveStudent({
          ...who,
          total,
          expected: [...marks.values()].reduce((a, b) => a + b, 0),
          shown: flat(await student.resultScore.innerText()),
        });
        await expect
          .poll(async () => (await rosterCounts(user))?.submitted ?? 0, {
            message: `${who.name} shows as Submitted`,
            timeout: 60000,
          })
          .toBeGreaterThan(before.submitted);
      } finally {
        await context.close();
      }
    }
  );

  test(
    "FLOW-13-06: each student's score is correct for their answers",
    { tag: ['@regression'] },
    async ({ browser }) => {
      test.skip(!(readState(F13).started || []).length, 'Needs the test started in FLOW-13-02');
      const s = await takeWholeTest(browser, (i) => (i % 2 === 0 ? 'right' : 2));
      saveStudent(s);
      const wrong = (readState(F13).students || [])
        .map((x) => ({ ...x, score: scoreOf(x.shown) }))
        .filter((x) => !x.score || x.score.got !== x.expected || x.score.outOf !== x.total)
        .map((x) => `${x.roll} ${x.name}: screen "${x.shown}", answers earned ${x.expected}/${x.total}`);
      expect(wrong, 'every student sees the score their answers earned').toEqual([]);
    }
  );

  test('FLOW-13-09: a student with a wrong code cannot join', { tag: ['@negative'] }, async ({ browser }) => {
    test.skip(!(readState(F13).started || []).length, 'Needs the test started in FLOW-13-02');
    const { context, student } = await openStudentSite(browser);
    try {
      await student.chooseClass(GRADE, DIVISION);
      const r = await student.checkRoll(9999);
      expect(r.ok, 'a roll number not in the class is refused').toBe(false);
      await expect(student.startBtn, 'no way into the test').toBeDisabled();
    } finally {
      await context.close();
    }
  });

  test(
    'FLOW-13-10: a student who loses the network mid-test can continue with their answers kept',
    { tag: ['@interruption'] },
    async ({ browser }) => {
      test.skip(!(readState(F13).started || []).length, 'Needs the test started in FLOW-13-02');
      const { context, student } = await openStudentSite(browser);
      try {
        await student.chooseClass(GRADE, DIVISION);
        const who = await student.signInNextStudent(GRADE, DIVISION, nextRoll());
        await student.startMission();
        // Question 1 answered right while online, then the network drops for a while and comes back.
        await answerRight(student);
        await context.setOffline(true);
        await student.page.waitForTimeout(10000);
        await context.setOffline(false);
        await student.page.waitForTimeout(5000);
        let total = 1;
        while (await student.nextQuestionBtn.isVisible()) {
          await student.nextQuestionBtn.click();
          await student.page.waitForTimeout(800);
          await answerRight(student);
          total++;
        }
        await student.endMission();
        await expect(student.resultScore).toBeVisible({ timeout: 30000 });
        const shown = flat(await student.resultScore.innerText());
        saveStudent({ ...who, total, expected: total, shown });
        expect(
          scoreOf(shown),
          `every answer counted, also the one given before the network dropped (${shown})`
        ).toEqual({ got: total, outOf: total });
      } finally {
        await context.close();
      }
    }
  );

  test(
    'FLOW-13-05: ending the test stops students from answering',
    { tag: ['@functional'] },
    async ({ user, browser }) => {
      const rt = readState(F13).test;
      test.skip(!(readState(F13).started || []).length, 'Needs the test started in FLOW-13-02');
      const { context, student } = await openStudentSite(browser);
      try {
        await student.chooseClass(GRADE, DIVISION);
        const who = await student.signInNextStudent(GRADE, DIVISION, nextRoll());
        await student.startMission();
        // This student starts but answers nothing before the end: the results count them with 0 marks (FLOW-13-07).
        saveStudent({ ...who, total: parseInt(rt.questions, 10), expected: 0, shown: '' });
        await openRevisionTestCard(user, rt);
        await endCheckpoint(user);
        writeState(F13, { started: [], ended: true });
        await expect(user.player.checkpointEndBtn, 'the test is ended').toBeHidden({ timeout: 30000 });
        // The student still on the test tries to answer. The site may already have taken the student off the test
        // (back to the sign-in page), which also stops answering.
        await student.page.waitForTimeout(5000);
        const onQuestion = await student.answerLabels
          .first()
          .isVisible()
          .catch(() => false);
        if (!onQuestion) {
          await expect(student.questionText.first(), 'the student is taken off the test').toBeHidden();
          return;
        }
        const attempt = await student.answer(0).catch(() => null);
        const accepted = attempt ? attempt.ok() : false;
        const told = await student.page
          .getByText(/ended|closed|locked|time.?up|over|not allowed/i)
          .filter({ visible: true })
          .first()
          .isVisible({ timeout: 10000 })
          .catch(() => false);
        expect(!accepted || told, 'after the end, the answer is refused or the student is told the test is over').toBe(
          true
        );
      } finally {
        await context.close();
      }
    }
  );

  test(
    "FLOW-13-07: the same scores show in the teacher's results and the principal's report",
    { tag: ['@regression'] },
    async ({ user, browser }) => {
      test.setTimeout(40 * 60 * 1000);
      const { test: rt, students = [], ended } = readState(F13);
      test.skip(!ended || !students.length, 'Needs the students of FLOW-13-03..10 and the end in FLOW-13-05');
      await openRevisionTestCard(user, rt);
      await expect(user.page.getByText(/\d+\s*\/\s*\d+\s*Students/).first()).toBeVisible({ timeout: 30000 });
      await user.page.waitForTimeout(3000);
      const summary = flat(await user.page.locator('body').innerText());
      const attempted = summary.match(/(\d+)\s*\/\s*(\d+)\s*Students/);
      const avg = summary.match(/AVG\.?\s*SCORE:\s*(\d+)%/i);
      const expectedAvg = students.reduce((a, s) => a + (100 * s.expected) / s.total, 0) / students.length;
      expect(Number(attempted && attempted[1]), "the teacher's results count every student").toBe(students.length);
      expect(
        Math.abs(Number(avg && avg[1]) - expectedAvg),
        `teacher average ${avg && avg[1]}%, expected ${expectedAvg.toFixed(1)}%`
      ).toBeLessThanOrEqual(1);
      await user.player.checkpointCloseBtn.click({ force: true, timeout: 5000 }).catch(() => {});
      // The principal, in a second session.
      const context = await browser.newContext({ baseURL: BASE_URL });
      let text;
      try {
        text = await readPrincipalReportFor(new App(await context.newPage()), rt.title, students);
      } finally {
        await context.close();
      }
      const wrong = students
        .map((s) => ({ s, shown: reportPercent(text, s.name), want: Math.round((100 * s.expected) / s.total) }))
        .filter((x) => x.shown === null || Math.abs(x.shown - x.want) > 1)
        .map((x) => `${x.s.name}: report ${x.shown === null ? 'missing' : x.shown + '%'}, scored ${x.want}%`);
      expect(wrong, "the principal's report shows the same score for every student").toEqual([]);
    }
  );

  test(
    'FLOW-13-08: a test run on paper accepts each student’s marks and shows them in the report',
    { tag: ['@regression'] },
    async ({ user }) => {
      test.setTimeout(15 * 60 * 1000);
      const page = user.page;
      const p = user.player;
      const dir = path.join(os.tmpdir(), 'flow-13-paper');
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      const paper = await createFreshRevisionTest(user, { prefix: 'AutoTest flow paper' });
      await openRevisionTestCard(user, paper);
      await p.checkpointModeOfflineBtn.click();
      await expect(p.checkpointPaperWorkflow).toBeVisible({ timeout: 15000 });
      const previous = page.getByText(/PREVIOUSLY GENERATED PAPER/i).locator('xpath=..');
      await page
        .getByRole('button', { name: /Generate PDF/i })
        .first()
        .click();
      await expect(previous, 'the question paper is generated').toBeVisible({ timeout: 30000 });
      const paperDl = page.waitForEvent('download', { timeout: 30000 });
      await previous.locator('button').last().click();
      await paperDl;
      await page.getByText('Conduct Assessment', { exact: true }).click();
      await expect(p.checkpointPaperTemplateBtn, 'the register is offered').toBeVisible({ timeout: 15000 });
      const templateDl = page.waitForEvent('download', { timeout: 30000 });
      await p.checkpointPaperTemplateBtn.click();
      const template = path.join(dir, 'template.xlsx');
      await (await templateDl).saveAs(template);
      // Every student gets every question right (row 3: question headers from column C; students from row 5).
      const wb = XLSX.readFile(template, { cellFormula: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
      const questions = (rows[2] || []).slice(2).filter((h) => h && /^Q/i.test(String(h))).length;
      let students = 0;
      rows.slice(4).forEach((row, i) => {
        if (!Number(row[0])) return;
        students++;
        for (let q = 0; q < questions; q++) sheet[XLSX.utils.encode_cell({ r: 4 + i, c: 2 + q })] = { t: 'n', v: 1 };
      });
      const filled = path.join(dir, 'register.xlsx');
      XLSX.writeFile(wb, filled);
      await page
        .getByText('Upload Evaluated Register', { exact: true })
        .click()
        .catch(() => {});
      await p.checkpointPaperUploadInput.setInputFiles(filled);
      await expect(p.checkpointMarksPreview, 'the marks preview opens').toBeVisible({ timeout: 20000 });
      const upload = page.waitForResponse((r) => /upload-answers/.test(r.url()), { timeout: 60000 });
      await p.checkpointMarksSubmitBtn.click();
      expect((await upload).ok(), 'the marks are accepted').toBe(true);
      await p.checkpointMessageOkBtn.click({ timeout: 5000 }).catch(() => {});
      await page.reload();
      await expect(user.login.avatar).toBeVisible({ timeout: 30000 });
      await user.nav.applyClassMap('compassRevisionTest');
      await openRevisionTestCard(user, paper);
      await expect(page.getByText(/\d+\s*\/\s*\d+\s*Students/).first()).toBeVisible({ timeout: 30000 });
      await page.waitForTimeout(3000);
      const summary = flat(await page.locator('body').innerText());
      const attempted = summary.match(/(\d+)\s*\/\s*(\d+)\s*Students/);
      const avg = summary.match(/AVG\.?\s*SCORE:\s*(\d+)%/i);
      expect(Number(attempted && attempted[1]), 'every student of the register is in the results').toBe(students);
      expect(Number(avg && avg[1]), 'all marks full: average 100%').toBe(100);
    }
  );

  test(
    'FLOW-13-11: the test ends on its own when the time runs out and keeps the answers given',
    { tag: ['@negative', '@long'] },
    async ({ user, browser }) => {
      test.setTimeout(60 * 60 * 1000);
      const rt = await createFreshRevisionTest(user, { prefix: 'AutoTest flow timer' });
      await openRevisionTestCard(user, rt);
      await startCheckpoint(user, 'online');
      remember(rt);
      const { context, student } = await openStudentSite(browser);
      try {
        await student.chooseClass(GRADE, DIVISION);
        await student.signInNextStudent(GRADE, DIVISION, 1);
        await student.startMission();
        await answerRight(student);
        // Wait out the test's time (the card says how many minutes; 30 by default), plus two minutes.
        const minutes = Number((flat(await user.page.locator('body').innerText()).match(/(\d+)\s*MIN/) || [])[1] || 30);
        await student.page.waitForTimeout((minutes + 2) * 60 * 1000);
        await expect(
          student.resultScore.or(student.page.getByText(/time.?(is )?up|time over|ended/i)).first(),
          'the student is told the time is up'
        ).toBeVisible({ timeout: 30000 });
        await user.page.reload();
        await expect(user.login.avatar).toBeVisible({ timeout: 30000 });
        await user.nav.applyClassMap('compassRevisionTest');
        await openRevisionTestCard(user, rt);
        await expect(user.player.checkpointEndBtn, 'the test has ended by itself').toBeHidden({ timeout: 30000 });
        const summary = flat(await user.page.locator('body').innerText());
        const avg = summary.match(/AVG\.?\s*SCORE:\s*(\d+)%/i);
        expect(Number(avg && avg[1]), 'the answer given before the time ran out is kept').toBeGreaterThan(0);
      } finally {
        await context.close();
      }
    }
  );
});

// ---------------------------------------------------------------------------------------------------------------------
// FLOW-14
// ---------------------------------------------------------------------------------------------------------------------

test.describe('FLOW-14 Content Library and Code Editor in Plan Mode', () => {
  test.skip(!process.env.RUN_IN_BROWSER, BROWSER_ONLY);
  test.describe.configure({ timeout: 240000 });

  test.beforeEach(async ({ app }) => {
    await openPlanMode(app);
  });

  /** Unfold the first chapter and its first topic; returns the topic's name. */
  const openFirstTopic = async (app) => {
    await app.plan.openBook();
    const [first] = await app.plan.bookChapters();
    await app.plan.expandChapter(first);
    const topicRow = app.plan.page
      .locator('li.cdk-drag')
      .filter({ hasText: /^\s*Topic 1\b/ })
      .first();
    const topic = (await topicRow.innerText()).split(/\n/)[1].trim();
    await app.plan.expandTopic(topic);
    return topic;
  };

  test(
    'FLOW-14-01: the Content Library lists content for the class and subject',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      await app.plan.openBook();
      await expect(app.plan.classSubjectHeading, 'the class and subject').toContainText(/Class 12\s*\|\s*Physics/);
      expect((await app.plan.bookChapters()).length, 'the chapters of the book').toBeGreaterThan(1);
      await openFirstTopic(app);
      await expect(app.plan.resourceRows.first(), "the topic's content").toBeVisible({ timeout: 10000 });
    }
  );

  test('FLOW-14-02: content can be previewed', { tag: ['@functional'] }, async ({ app, page }) => {
    await openFirstTopic(app);
    const row = app.plan.resourceRows.first();
    await expect(row, 'set-up: the topic lists content').toBeVisible({ timeout: 10000 });
    const media = page.locator('img, video, iframe, canvas, embed, object').filter({ visible: true });
    const before = await media.count();
    await row.locator('.topicEdit').nth(1).click();
    await expect
      .poll(async () => media.count(), { message: 'a preview of the content opens', timeout: 20000 })
      .toBeGreaterThan(before);
  });

  test(
    "FLOW-14-03: content added to a topic shows in that topic's playlist in Teach Mode",
    { tag: ['@functional'] },
    async ({ app }) => {
      const name = autoName('flow image');
      try {
        await openFirstTopic(app);
        const r = await app.plan.addResource(PNG_FILE, name, 'Images');
        expect(r.ok(), 'set-up: the content is added to topic 1.1').toBe(true);
        const card = await quizCardInTeach(app, name);
        await expect(card, "it is in the topic's Playlist").toHaveCount(1, { timeout: 20000 });
      } finally {
        await removeQuiz(app, name);
      }
    }
  );

  test(
    'FLOW-14-04: the Code Editor runs a small program and shows its output',
    { tag: ['@functional'] },
    async ({ app }) => {
      await app.plan.openSection('Code Editor');
      await expect(app.plan.codeEditor, 'set-up: the editor').toBeVisible({ timeout: 15000 });
      await app.plan.setCode('for i in range(3):\n    print("line", i)');
      const out = await app.plan.runCode();
      expect(out, 'the output of the program').toContain('line 2');
    }
  );

  test(
    'FLOW-14-05: code with an error shows the error, not a blank output',
    { tag: ['@negative'] },
    async ({ app }) => {
      await app.plan.openSection('Code Editor');
      await expect(app.plan.codeEditor, 'set-up: the editor').toBeVisible({ timeout: 15000 });
      await app.plan.setCode('print(undefined_name)');
      const out = await app.plan.runCode();
      expect(out, 'the output names the error').toMatch(/error/i);
    }
  );
});

// ---------------------------------------------------------------------------------------------------------------------
// FLOW-15
// ---------------------------------------------------------------------------------------------------------------------

/** Sign in to the Admin panel (the school autocomplete, then user name and password). */
async function adminSignIn(page) {
  await page.goto(process.env.ADMIN_URL || new URL('/admin/', BASE_URL).href, { waitUntil: 'load', timeout: 60000 });
  const inputs = page.locator('input:visible');
  await inputs.first().waitFor({ timeout: 30000 });
  await inputs.nth(0).click();
  await inputs.nth(0).pressSequentially(process.env.ADMIN_SCHOOL.slice(0, 8), { delay: 30 });
  await page
    .locator('ng-autocomplete li')
    .filter({ hasText: process.env.ADMIN_SCHOOL })
    .first()
    .click({ timeout: 15000 });
  await inputs.nth(1).fill(process.env.ADMIN_USERNAME);
  await inputs.nth(2).fill(process.env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page
    .getByText(/dashboard/i)
    .first()
    .waitFor({ timeout: 30000 });
}

/** Admin: Manage School -> the school's ⋮ -> `item` (e.g. 'Daily Report'); returns the page text once it shows. */
async function adminSchoolReport(page, item, marker) {
  await page
    .getByText(/^\s*MANAGE\s*$/i)
    .first()
    .click()
    .catch(() => {});
  await page.waitForTimeout(800);
  await page
    .getByText(/Manage School/i)
    .first()
    .click();
  const row = page.locator('tr').filter({ hasText: process.env.ADMIN_SCHOOL }).first();
  await row.locator('button.dropdown-toggle').click({ timeout: 20000 });
  await page.locator('button.dropdown-item').filter({ hasText: item }).first().click();
  await page.getByText(marker).first().waitFor({ timeout: 60000 });
  // The report's data comes after its heading: wait while it still says "Loading...".
  await page
    .getByText(/^\s*Loading\.*\s*$/)
    .first()
    .waitFor({ state: 'hidden', timeout: 120000 })
    .catch(() => {});
  await page.waitForTimeout(4000);
  return flat(await page.locator('body').innerText());
}

test.describe('FLOW-15 Reports: what happened in class reaches the principal and the admin', () => {
  test.skip(!process.env.RUN_IN_BROWSER, BROWSER_ONLY);
  test.describe.configure({ timeout: 180000 });

  const openPlanAsPrincipal = async (app) => {
    await app.guest.open();
    await app.signIn(process.env.PRINCIPAL_PIN);
    const { switched } = await app.compass.switchToPlanningMode();
    expect(switched, 'set-up: Plan Mode opened').toBe(true);
    await app.page.waitForTimeout(5000);
  };

  test(
    'FLOW-15-01: the principal sees the test the teacher ran, with each student’s score',
    { tag: ['@regression'] },
    async ({ app }) => {
      test.setTimeout(40 * 60 * 1000);
      const { test: rt, students = [] } = readState(F13);
      test.skip(!rt || !students.length, 'Needs the test and students of FLOW-13');
      const text = await readPrincipalReportFor(app, rt.title, students);
      expect(text, `the report of "${rt.title}" is listed`).not.toBe('');
      const missing = students.filter((s) => reportPercent(text, s.name) === null).map((s) => s.name);
      expect(missing, 'every student who took the test is in the report with a score').toEqual([]);
    }
  );

  test(
    "FLOW-15-02: the principal's band view puts each student in the right band",
    { tag: ['@regression'] },
    async ({ app }) => {
      test.setTimeout(40 * 60 * 1000);
      const { test: rt, students = [] } = readState(F13);
      test.skip(!rt || !students.length, 'Needs the test and students of FLOW-13');
      const text = await readPrincipalReportFor(app, rt.title, students);
      expect(text, 'set-up: the report lists the students').not.toBe('');
      // The band chips: Weak 0–40 %, Moderate 41–65 %, Strong 66–100 %.
      const bandOf = (pct) => (pct <= 40 ? 'Weak' : pct <= 65 ? 'Moderate' : 'Strong');
      const wrong = [];
      for (const chip of ['Weak', 'Moderate', 'Strong']) {
        await app.plan.aflBandChip(chip).click();
        await app.page.waitForTimeout(2500);
        const shown = flat(await app.page.locator('body').innerText());
        for (const s of students) {
          const want = bandOf(Math.round((100 * s.expected) / s.total));
          const listed = new RegExp(`${s.name}[^%]{0,60}?\\d+%`).test(shown);
          if (listed !== (want === chip))
            wrong.push(`${s.name} (${want}) ${listed ? 'listed' : 'missing'} under ${chip}`);
        }
      }
      expect(wrong, 'each student is under their own band only').toEqual([]);
    }
  );

  test(
    "FLOW-15-03: the teacher's usage today shows in the Admin daily report",
    { tag: ['@regression'] },
    async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
      const page = await context.newPage();
      try {
        await adminSignIn(page);
        const text = await adminSchoolReport(page, 'Daily Report', 'Realtime usage data');
        // The main teacher (raj.shinde) has used the app today: the runs sign in with that account.
        expect(text, "today's report").toMatch(/Daily Report/);
        expect(text, 'the teacher has usage rows today').toMatch(/Raj Shinde\s+\w{3} \d+, \d{4}, \d+:\d\d:\d\d [AP]M/);
        const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        expect(text, `the rows are of today (${today})`).toContain(`Raj Shinde ${today}`);
      } finally {
        await context.close();
      }
    }
  );

  test(
    "FLOW-15-04: the month's usage shows in the Admin monthly report",
    { tag: ['@regression'] },
    async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
      const page = await context.newPage();
      try {
        await adminSignIn(page);
        const text = await adminSchoolReport(page, 'Monthly Report', 'School Usage Data');
        const month = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).replace(' ', '-');
        expect(text, `the report offers this month (${month})`).toContain(month);
      } finally {
        await context.close();
      }
    }
  );

  test('FLOW-15-05: attendance submitted in class shows in the reports', { tag: ['@regression'] }, async ({ app }) => {
    // The principal's reports are where the school's attendance would be followed: one of them must show 10A's
    // attendance.
    await openPlanAsPrincipal(app);
    const found = [];
    for (const tab of ['Principal Dashboard', 'School Usage', 'Content Statistics', 'Assessment for Learning']) {
      await app.plan.openReport(tab).catch(() => {});
      const text = flat(await app.page.locator('body').innerText());
      if (/attendance/i.test(text)) found.push(tab);
    }
    expect(found, 'a report shows the attendance taken in class').not.toEqual([]);
  });

  test(
    'FLOW-15-06: the same number (students, terminals, tests) is the same on every report that shows it',
    { tag: ['@negative'] },
    async ({ app, browser }) => {
      const totals = (text) => {
        const m = text.match(/Total users:?\s*(\d+)\s*Eligible users:?\s*(\d+).*?Installed Classrooms:?\s*(\d+)/);
        return m ? { users: Number(m[1]), installedClassrooms: Number(m[3]) } : null;
      };
      // The principal's dashboard ...
      await openPlanAsPrincipal(app);
      await app.plan.openReport('Principal Dashboard');
      await app.page
        .getByText(/Installed Classrooms/)
        .first()
        .waitFor({ timeout: 60000 })
        .catch(() => {});
      await app.page.waitForTimeout(2000);
      const principal = totals(flat(await app.page.locator('body').innerText()));
      // ... and the Admin daily and monthly reports, the same day.
      const adminReport = async (item, marker) => {
        const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
        try {
          const page = await context.newPage();
          await adminSignIn(page);
          return await adminSchoolReport(page, item, marker);
        } finally {
          await context.close();
        }
      };
      const daily = totals(await adminReport('Daily Report', 'Realtime usage data'));
      const monthly = await adminReport('Monthly Report', 'School Usage Data');
      const monthlyTerminals = Number((monthly.match(/No\. of Classroom Terminals\s*(\d+)/) || [])[1]);
      expect(principal, 'set-up: the principal dashboard shows its totals').not.toBeNull();
      expect(daily, 'set-up: the Admin daily report shows its totals').not.toBeNull();
      const differences = [];
      if (principal.users !== daily.users)
        differences.push(`users: principal ${principal.users}, Admin daily ${daily.users}`);
      if (principal.installedClassrooms !== daily.installedClassrooms)
        differences.push(
          `classrooms: principal ${principal.installedClassrooms}, Admin daily ${daily.installedClassrooms}`
        );
      if (monthlyTerminals !== daily.installedClassrooms)
        differences.push(`classroom terminals: Admin monthly ${monthlyTerminals}, daily ${daily.installedClassrooms}`);
      expect(differences, 'the same numbers on every report').toEqual([]);
    }
  );
});
