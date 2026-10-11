// CHK-09 — Scores are correct everywhere
// Source: CEPV2_Stories/21_Checkpoints.md
// One run of the class map's score checkpoint ('scoreCheckpointTitle'): four students answer in different ways (one answers nothing), the
// marks the student site itself sends for each answer are added up, and that expected score is compared with the
// student's result screen, the teacher's summary and the principal's report. The tests share what they measured
// through a small file, so a later test still has it if an earlier one fails.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, expect } = require('../../fixtures');
const {
  BROWSER_ONLY,
  CP,
  GRADE,
  DIVISION,
  startCheckpoint,
  endCheckpoint,
  endStartedTests,
  openStudentSite,
} = require('./chk-helpers');

const STATE = path.join(os.tmpdir(), 'chk-09-scores.json');
const readState = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : { students: [] });
const saveStudent = (s) => {
  const state = readState();
  state.students = state.students.filter((x) => x.roll !== s.roll).concat(s);
  fs.writeFileSync(STATE, JSON.stringify(state, null, 2));
};

test.describe('CHK-09 Scores are correct everywhere', () => {
  test.skip(!process.env.RUN_IN_BROWSER, BROWSER_ONLY);
  test.use({ classMap: 'checkpoints' });
  test.describe.configure({ timeout: 360000 });

  const card = (user) => user.playlist.resourceCards.filter({ hasText: CP.scoreCheckpointTitle }).first();
  const openScoreCheckpoint = async (user) => {
    await expect(card(user), 'set-up: the score checkpoint is in the Playlist').toBeAttached({ timeout: 20000 });
    await user.player.openResourceCard(card(user));
    const p = user.player;
    await expect(p.checkpointTimerBadge.or(p.checkpointResumeBtn).or(p.checkpointModeOnlineBtn).first()).toBeVisible({
      timeout: 20000,
    });
  };

  /**
   * Sign the next student in, answer with `pick(questionIndex)` (an option index, or null to skip), end the mission,
   * and return { roll, name, expected, total, shown }: the marks the site recorded for the answers, the number of
   * questions, and the score line on the result screen.
   */
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

  test('set-up: the score checkpoint is running online', { tag: ['@regression'] }, async ({ user }) => {
    fs.rmSync(STATE, { force: true });
    await endStartedTests(user, 'checkpoints'); // no other test of the class is running
    await openScoreCheckpoint(user);
    await startCheckpoint(user, 'online');
  });

  test(
    'CHK-09-01: a student who answers every question sees the score their answers earned',
    { tag: ['@regression'] },
    async ({ browser }) => {
      const s = await takeTest(browser, 1, () => 0);
      saveStudent(s);
      const score = scoreOf(s.shown);
      expect(score, `result line: ${s.shown}`).not.toBeNull();
      expect(score.outOf, 'out of every question').toBe(s.total);
      expect(score.got, `the marks of the answers given (${s.expected})`).toBe(s.expected);
    }
  );

  test(
    'CHK-09-02: a second student with different answers sees their own correct score',
    { tag: ['@regression'] },
    async ({ browser }) => {
      const from = Math.max(1, ...readState().students.map((x) => x.roll + 1));
      const s = await takeTest(browser, from, (i) => (i % 2 === 0 ? 1 : 2));
      saveStudent(s);
      const score = scoreOf(s.shown);
      expect(score, `result line: ${s.shown}`).not.toBeNull();
      expect(score.outOf).toBe(s.total);
      expect(score.got, `the marks of the answers given (${s.expected})`).toBe(s.expected);
    }
  );

  test(
    'CHK-09-03: a student who answers only some questions is scored out of all the questions',
    { tag: ['@edge'] },
    async ({ browser }) => {
      const from = Math.max(1, ...readState().students.map((x) => x.roll + 1));
      const s = await takeTest(browser, from, (i) => (i < 3 ? 3 : null));
      saveStudent(s);
      const score = scoreOf(s.shown);
      expect(score, `result line: ${s.shown}`).not.toBeNull();
      expect(score.outOf, 'out of every question, not only the answered ones').toBe(s.total);
      expect(score.got, `the marks of the answers given (${s.expected})`).toBe(s.expected);
    }
  );

  // Saved with the others, so CHK-09-04..06 count this student in the teacher's and the principal's totals too.
  test(
    'CHK-09-07: a student who answers nothing is scored 0, not left out of the totals',
    { tag: ['@negative'] },
    async ({ browser }) => {
      const from = Math.max(1, ...readState().students.map((x) => x.roll + 1));
      const s = await takeTest(browser, from, () => null);
      saveStudent(s);
      const score = scoreOf(s.shown);
      expect(score, `result line: ${s.shown}`).not.toBeNull();
      expect(score.outOf, 'out of every question').toBe(s.total);
      expect(score.got, 'no answer, no marks').toBe(0);
    }
  );

  test(
    'CHK-09-04: the teacher’s summary counts every student who took the test',
    { tag: ['@regression'] },
    async ({ user }) => {
      const { students } = readState();
      test.skip(!students.length, 'Needs the students of CHK-09-01 to 03');
      await openScoreCheckpoint(user);
      await startCheckpoint(user, 'online');
      await endCheckpoint(user);
      await user.page.reload();
      await expect(user.login.avatar).toBeVisible({ timeout: 30000 });
      await user.nav.applyClassMap('checkpoints');
      await user.playlist.ensureDrawerVisible();
      await openScoreCheckpoint(user);
      await expect(user.page.getByText(/\d+\s*\/\s*\d+\s*Students/).first()).toBeVisible({ timeout: 20000 });
      const text = (await user.page.locator('body').innerText()).replace(/\s+/g, ' ');
      const attempted = text.match(/(\d+)\s*\/\s*(\d+)\s*Students/);
      expect(attempted, 'the summary shows how many attempted').not.toBeNull();
      expect(Number(attempted[1]), `students who took it: ${students.map((s) => s.name).join(', ')}`).toBe(
        students.length
      );
      fs.writeFileSync(STATE, JSON.stringify({ ...readState(), summary: text.slice(0, 600) }, null, 2));
    }
  );

  test(
    'CHK-09-05: the teacher’s average score matches the students’ scores',
    { tag: ['@regression'] },
    async ({ user }) => {
      const { students } = readState();
      test.skip(!students.length, 'Needs the students of CHK-09-01 to 03');
      await openScoreCheckpoint(user);
      const text = (await user.page.locator('body').innerText()).replace(/\s+/g, ' ');
      const avg = text.match(/AVG\.?\s*SCORE:\s*(\d+)%/i);
      expect(avg, 'the summary shows an average score').not.toBeNull();
      const percents = students.map((s) => (100 * s.expected) / s.total);
      const expected = percents.reduce((a, b) => a + b, 0) / percents.length;
      expect(
        Math.abs(Number(avg[1]) - expected),
        `average shown ${avg[1]}%, expected about ${expected.toFixed(1)}%`
      ).toBeLessThanOrEqual(1);
    }
  );

  test(
    'CHK-09-06: the principal’s report lists each student with the percentage they scored',
    { tag: ['@regression'] },
    async ({ app }) => {
      const { students } = readState();
      test.skip(!students.length, 'Needs the students of CHK-09-01 to 03');
      await app.guest.open();
      await app.signIn(process.env.PRINCIPAL_PIN);
      await app.compass.switchToPlanningMode();
      await app.page.waitForTimeout(5000);
      await app.plan.openReport('Assessment for Learning');
      await app.plan.aflBaselineBtn.click();
      await app.page.waitForTimeout(2500);
      await app.plan.aflGradeSelect.selectOption({ label: GRADE });
      await app.page.waitForTimeout(2500);
      await app.plan.aflClassSelect.selectOption({ label: DIVISION });
      await app.page.waitForTimeout(2500);
      await app.plan.aflSubjectSelect.selectOption({ label: CP.subject });
      await app.page.waitForTimeout(3000);
      await app.plan.aflAssessmentSelect.selectOption({ label: CP.scoreCheckpointTitle });
      await app.page.waitForTimeout(5000);
      const text = (await app.page.locator('body').innerText()).replace(/\s+/g, ' ');
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
