// CHK-10 — Run a Revision Test with the class
// Source: CEPV2_Stories/21_Checkpoints.md
// A Revision Test is launched from Teach Mode's Compass (Revision Test section) on the 'compassRevisionTest' topic.
// Students take it on the student test site like a checkpoint; the marks the site sends for each answer are added up
// and compared with the student's result screen, the teacher's summary and the principal's Revision report. The tests
// share what they measured through a small file, so a later test still has it if an earlier one fails. The test ends
// the revision test again before it finishes.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, expect } = require('../../fixtures');
const { getClassMap } = require('../../config/moduleClassMap');
const { BROWSER_ONLY, startCheckpoint, endCheckpoint, rosterCounts, openStudentSite } = require('./chk-helpers');
const { createFreshRevisionTest } = require('./fresh-revision-test');

const RT_CLASS = getClassMap('compassRevisionTest');
const GRADE = RT_CLASS.grade;
const DIVISION = `Division ${RT_CLASS.division}`;
// The Revision Test the run uses: CHK10_REVISION="<title>|<questions>" names one; otherwise CHK-10-01 creates a fresh
// one (fresh-revision-test.js), so no student has signed in to it yet. Its title is unique in the topic, so the
// principal's Assessment list finds it.
const [namedTitle, namedQuestions] = (process.env.CHK10_REVISION || '').split('|');
const NAMED_TEST = namedTitle ? { title: namedTitle, questions: namedQuestions || "2 Q'S" } : null;
const revisionTest = () => NAMED_TEST || readState().revisionTest || { title: 'Test2', questions: "2 Q'S" };

const STATE = path.join(os.tmpdir(), 'chk-10-revision-test.json');
const readState = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : { students: [] });
const writeState = (patch) => fs.writeFileSync(STATE, JSON.stringify({ ...readState(), ...patch }, null, 2));
const saveStudent = (s) =>
  writeState({
    students: readState()
      .students.filter((x) => x.roll !== s.roll)
      .concat(s),
  });

test.describe('CHK-10 Run a Revision Test with the class', () => {
  test.skip(!process.env.RUN_IN_BROWSER, BROWSER_ONLY);
  test.use({ classMap: 'compassRevisionTest' });
  test.describe.configure({ timeout: 360000 });

  const card = (user) =>
    user.compass.revisionTestCards
      .filter({ hasText: revisionTest().title })
      .filter({ hasText: revisionTest().questions });

  /** Compass -> Revision Test -> the run's card; waits for its panel (mode choice, summary or running roster). */
  const openRevisionTest = async (user) => {
    const { opened } = await user.compass.openTrigger();
    expect(opened, 'set-up: the Compass menu opened').toBe(true);
    await user.compass.revisionTestsItem.click({ force: true });
    await expect(card(user).first(), 'set-up: the Revision Test is listed').toBeVisible({ timeout: 20000 });
    await card(user).first().click({ force: true });
    const p = user.player;
    await expect(p.checkpointTimerBadge.or(p.checkpointResumeBtn).or(p.checkpointModeOnlineBtn).first()).toBeVisible({
      timeout: 20000,
    });
  };

  const reloadTeacher = async (user) => {
    await user.page.reload();
    await expect(user.login.avatar).toBeVisible({ timeout: 30000 });
    await user.nav.applyClassMap('compassRevisionTest');
  };

  /** Sign the next student in, answer with pick(i) (option index or null to skip), end, and measure the score. */
  const takeTest = async (browser, from, pick) => {
    const { context, student } = await openStudentSite(browser);
    const marks = new Map();
    student.page.on('request', (r) => {
      const body = r.postData() || '';
      if (!/client\/attempts/.test(r.url()) || !/"ATTEMPT"/.test(body)) return;
      const event = JSON.parse(body);
      const meta = JSON.parse(event.answerMetadata || '{}');
      marks.set(event.questionId, Number(meta.marksObtained) || 0);
    });
    await student.chooseClass(GRADE, DIVISION);
    const who = await student.signInNextStudent(GRADE, DIVISION, from);
    await student.startMission();
    let total = 0;
    for (let i = 0; i < 100; i++) {
      total++;
      const option = pick(i);
      if (option !== null) await student.answer(option);
      if (!(await student.nextQuestionBtn.isVisible())) break;
      await student.nextQuestionBtn.click();
      await student.page.waitForTimeout(800);
    }
    await student.endMission();
    await expect(student.resultScore).toBeVisible({ timeout: 20000 });
    const shown = (await student.resultScore.innerText()).replace(/\s+/g, ' ');
    await context.close();
    const expected = [...marks.values()].reduce((a, b) => a + b, 0);
    return { roll: who.roll, name: who.name, expected, total, shown };
  };

  const scoreOf = (shown) => {
    const m = shown.match(/Score:\s*(\d+)\s*\/\s*(\d+)/);
    return m ? { got: Number(m[1]), outOf: Number(m[2]) } : null;
  };
  const nextFrom = () => Math.max(1, ...readState().students.map((x) => x.roll + 1));

  test(
    'CHK-10-01: Compass lists the topic’s Revision Tests with their duration and question count',
    { tag: ['@functional'] },
    async ({ user }) => {
      fs.rmSync(STATE, { force: true });
      if (!NAMED_TEST) writeState({ revisionTest: await createFreshRevisionTest(user) });
      const { opened } = await user.compass.openTrigger();
      expect(opened, 'Compass menu opened').toBe(true);
      await expect(user.compass.revisionTestsItem).toContainText(/\d+ tests? available/i);
      await user.compass.revisionTestsItem.click({ force: true });
      await expect(user.compass.revisionTestCards.first()).toBeVisible({ timeout: 20000 });
      await expect(card(user).first()).toContainText(/\d+ MIN/);
      await expect(card(user).first()).toContainText(revisionTest().questions);
    }
  );

  test(
    'CHK-10-02: opening a Revision Test offers In-Lab Assessment and Paper Test',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openRevisionTest(user);
      const p = user.player;
      if (await p.checkpointEndBtn.isVisible().catch(() => false)) {
        test.info().annotations.push({ type: 'note', description: 'The Revision Test was already running' });
        return;
      }
      await expect(p.checkpointModeOnlineBtn.or(p.checkpointResumeBtn).first()).toBeVisible();
      if (await p.checkpointModeOnlineBtn.isVisible()) await expect(p.checkpointModeOfflineBtn).toBeVisible();
      await expect(user.page.getByText(/REVISION ASSESSMENT/i).first()).toBeVisible();
    }
  );

  test(
    'CHK-10-03: starting the Revision Test online shows the running timer and the class roster',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openRevisionTest(user);
      await startCheckpoint(user, 'online');
      await expect(user.player.checkpointTimerBadge).toBeVisible({ timeout: 20000 });
      await expect(user.player.checkpointStudentRows.first()).toBeAttached({ timeout: 20000 });
      const counts = await rosterCounts(user);
      expect(counts, 'the roster counts are shown').not.toBeNull();
      writeState({ rosterAtStart: counts });
    }
  );

  test(
    'CHK-10-04: a student who answers every question sees the score their answers earned',
    { tag: ['@regression'] },
    async ({ browser }) => {
      const s = await takeTest(browser, nextFrom(), () => 0);
      saveStudent(s);
      const score = scoreOf(s.shown);
      expect(score, `result line: ${s.shown}`).not.toBeNull();
      expect(score.outOf, 'out of every question').toBe(s.total);
      expect(score.got, `the marks of the answers given (${s.expected})`).toBe(s.expected);
    }
  );

  test(
    'CHK-10-05: a second student with different answers sees their own correct score',
    { tag: ['@regression'] },
    async ({ browser }) => {
      const s = await takeTest(browser, nextFrom(), (i) => (i % 2 === 0 ? 1 : 2));
      saveStudent(s);
      const score = scoreOf(s.shown);
      expect(score, `result line: ${s.shown}`).not.toBeNull();
      expect(score.outOf).toBe(s.total);
      expect(score.got, `the marks of the answers given (${s.expected})`).toBe(s.expected);
    }
  );

  test(
    'CHK-10-06: a student who answers only some questions is scored out of all the questions',
    { tag: ['@edge'] },
    async ({ browser }) => {
      const s = await takeTest(browser, nextFrom(), (i) => (i === 0 ? 3 : null));
      saveStudent(s);
      const score = scoreOf(s.shown);
      expect(score, `result line: ${s.shown}`).not.toBeNull();
      expect(score.outOf, 'out of every question, not only the answered ones').toBe(s.total);
      expect(score.got, `the marks of the answers given (${s.expected})`).toBe(s.expected);
    }
  );

  test(
    'CHK-10-07: the teacher’s roster shows the students who submitted as Submitted',
    { tag: ['@functional'] },
    async ({ user }) => {
      const { students } = readState();
      test.skip(!students.length, 'Needs the students of CHK-10-04 to 06');
      await openRevisionTest(user);
      await startCheckpoint(user, 'online');
      // The roster fills in a few seconds after the panel opens.
      await expect
        .poll(async () => (await rosterCounts(user))?.submitted, {
          message: 'every student who submitted',
          timeout: 30000,
        })
        .toBe(students.length);
    }
  );

  test(
    'CHK-10-08: End Checkpoint ends the Revision Test and its summary counts every student who took it',
    { tag: ['@regression'] },
    async ({ user }) => {
      const { students } = readState();
      await openRevisionTest(user);
      await startCheckpoint(user, 'online');
      await endCheckpoint(user);
      await expect(user.player.checkpointEndBtn).toBeHidden({ timeout: 30000 });
      await reloadTeacher(user);
      await openRevisionTest(user);
      await expect(user.player.checkpointEndBtn, 'no longer running after a reload').toBeHidden();
      await expect(user.page.getByText(/\d+\s*\/\s*\d+\s*Students/).first()).toBeVisible({ timeout: 20000 });
      const text = (await user.page.locator('body').innerText()).replace(/\s+/g, ' ');
      writeState({ summary: text.slice(0, 800) });
      const attempted = text.match(/(\d+)\s*\/\s*(\d+)\s*Students/);
      expect(attempted, 'the summary shows how many attempted').not.toBeNull();
      expect(Number(attempted[1]), `students who took it: ${students.map((s) => s.name).join(', ')}`).toBe(
        students.length
      );
    }
  );

  test(
    'CHK-10-09: the teacher’s average score matches the students’ scores',
    { tag: ['@regression'] },
    async ({ user }) => {
      const { students } = readState();
      test.skip(!students.length, 'Needs the students of CHK-10-04 to 06');
      await openRevisionTest(user);
      // The summary shows "Loading..." and a 0% average until its numbers arrive.
      await expect(user.page.getByText(/\d+\s*\/\s*\d+\s*Students/).first()).toBeVisible({ timeout: 30000 });
      await user.page.waitForTimeout(2000);
      const text = (await user.page.locator('body').innerText()).replace(/\s+/g, ' ');
      const avg = text.match(/AVG\.?\s*SCORE:\s*(\d+)%/i);
      expect(avg, 'the summary shows an average score').not.toBeNull();
      const percents = students.map((s) => (100 * s.expected) / s.total);
      const expected = percents.reduce((a, b) => a + b, 0) / percents.length;
      writeState({ teacherAvg: Number(avg[1]), expectedAvg: expected });
      expect(
        Math.abs(Number(avg[1]) - expected),
        `average shown ${avg[1]}%, expected about ${expected.toFixed(1)}%`
      ).toBeLessThanOrEqual(1);
    }
  );

  test(
    'CHK-10-10: Negative: a student cannot start the Revision Test after the teacher has ended it',
    { tag: ['@negative'] },
    async ({ browser }) => {
      const { context, student } = await openStudentSite(browser);
      const tile = student.gradeTiles.filter({ hasText: GRADE });
      const listed = await tile
        .first()
        .waitFor({ timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (listed) {
        await student.chooseClass(GRADE, DIVISION);
        const r = await student.checkRoll(nextFrom());
        expect(r.ok, `a new student is refused (server said: ${r.body.errorMessage || r.status})`).toBe(false);
      }
      await context.close();
    }
  );

  test(
    'CHK-10-11: the principal’s Revision report lists each student with the percentage they scored',
    { tag: ['@regression'] },
    async ({ app }) => {
      const { students } = readState();
      test.skip(!students.length, 'Needs the students of CHK-10-04 to 06');
      await app.guest.open();
      await app.signIn(process.env.PRINCIPAL_PIN);
      await app.compass.switchToPlanningMode();
      await app.page.waitForTimeout(5000);
      await app.plan.openReport('Assessment for Learning');
      await app.plan.aflRevisionBtn.click();
      await app.page.waitForTimeout(2500);
      await app.plan.aflGradeSelect.selectOption({ label: GRADE });
      await app.page.waitForTimeout(2500);
      await app.plan.aflClassSelect.selectOption({ label: DIVISION });
      await app.page.waitForTimeout(2500);
      await app.plan.aflSubjectSelect.selectOption({ label: RT_CLASS.subject });
      await app.page.waitForTimeout(3000);
      const options = await app.plan.aflAssessmentSelect.locator('option').allInnerTexts();
      writeState({ principalAssessments: options });
      const label = options.find((o) => o.trim() === revisionTest().title);
      expect(label, `the Revision Test is listed (options: ${options.join(' | ')})`).toBeTruthy();
      await app.plan.aflAssessmentSelect.selectOption({ label });
      await app.page.waitForTimeout(5000);
      const text = (await app.page.locator('body').innerText()).replace(/\s+/g, ' ');
      writeState({ principalReport: text.slice(0, 1500) });
      await app.page.screenshot({ path: test.info().outputPath('principal-revision.png') });
      for (const s of students) {
        const m = text.match(new RegExp(`${s.name}\\s+Section\\s+\\S+\\s+(\\d+)%`));
        expect(m, `${s.name} is listed with a percentage`).not.toBeNull();
        const expected = Math.round((100 * s.expected) / s.total);
        expect(
          Math.abs(Number(m[1]) - expected),
          `${s.name}: report ${m[1]}%, scored ${expected}%`
        ).toBeLessThanOrEqual(1);
      }
    }
  );
});
