// CHK-11 — The checkpoint time runs out
// Source: CEPV2_Stories/21_Checkpoints.md
// One run of the class map's timer checkpoint ('timerCheckpoint', never launched before): student X submits, student
// Y answers two questions and keeps the test open until the checkpoint's time runs out (about 30 minutes). The first
// test does the waiting and records what Y's screen and the site's requests showed; the later tests check the
// teacher's panel, the summary and the principal's report against the marks the site sent for each answer. They share
// what they measured through a small file, so a later test still has it if an earlier one fails.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, expect } = require('../../fixtures');
const {
  BROWSER_ONLY,
  CP,
  GRADE,
  DIVISION,
  openCheckpoint,
  startCheckpoint,
  endCheckpoint,
  endStartedTests,
  rosterCounts,
  openStudentSite,
} = require('./chk-helpers');

const TIMER = CP.timerCheckpoint;
const MAX_WAIT_MS = 42 * 60 * 1000;
const POLL_MS = 60 * 1000;

const STATE = path.join(os.tmpdir(), 'chk-11-timer.json');
const readState = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {});
const writeState = (patch) => fs.writeFileSync(STATE, JSON.stringify({ ...readState(), ...patch }, null, 2));

/** Records the marks the student site sends for each answer, and the END requests, of one student page. */
function trackAttempts(page) {
  const tracked = { marks: new Map(), ends: 0 };
  page.on('request', (r) => {
    const body = r.postData() || '';
    if (!/client\/attempts/.test(r.url())) return;
    if (/"END"/.test(body)) tracked.ends++;
    if (!/"ATTEMPT"/.test(body)) return;
    const event = JSON.parse(body);
    const meta = JSON.parse(event.answerMetadata || '{}');
    tracked.marks.set(event.questionId, Number(meta.marksObtained) || 0);
  });
  tracked.sum = () => [...tracked.marks.values()].reduce((a, b) => a + b, 0);
  return tracked;
}

const bodyText = async (page) =>
  (
    await page
      .locator('body')
      .innerText()
      .catch(() => '')
  ).replace(/\s+/g, ' ');

test.describe('CHK-11 The checkpoint time runs out', () => {
  test.skip(!process.env.RUN_IN_BROWSER, BROWSER_ONLY);
  test.use({ classMap: 'checkpoints' });
  test.describe.configure({ timeout: 360000 });

  test(
    'CHK-11-01: a student still answering when the time runs out is told the time is up',
    { tag: ['@long', '@edge'] },
    async ({ user, browser }) => {
      test.setTimeout(55 * 60 * 1000);
      fs.rmSync(STATE, { force: true });
      await endStartedTests(user, 'checkpoints'); // set-up: no other test of the class is running
      await openCheckpoint(user, TIMER);
      await startCheckpoint(user, 'online');
      const startedAt = Date.now();
      writeState({
        startedAt,
        teacherBadgeAtStart: await user.player.checkpointTimerBadge.innerText().catch(() => ''),
      });

      // Student X answers every question and submits.
      const x = await openStudentSite(browser);
      const xTrack = trackAttempts(x.student.page);
      await x.student.chooseClass(GRADE, DIVISION);
      const xWho = await x.student.signInNextStudent(GRADE, DIVISION, 1);
      await x.student.startMission();
      const xTotal = await x.student.answerAllAndEnd(0);
      await expect(x.student.resultScore).toBeVisible({ timeout: 20000 });
      writeState({
        x: { ...xWho, expected: xTrack.sum(), total: xTotal, shown: (await x.student.resultScore.innerText()).trim() },
      });
      await x.context.close();

      // Student Y answers two questions and leaves the test open.
      const y = await openStudentSite(browser);
      const yTrack = trackAttempts(y.student.page);
      await y.student.chooseClass(GRADE, DIVISION);
      const yWho = await y.student.signInNextStudent(GRADE, DIVISION, xWho.roll + 1);
      await y.student.startMission();
      await y.student.answer(1);
      await y.student.nextQuestionBtn.click();
      await y.student.page.waitForTimeout(1000);
      await y.student.answer(0);
      const yRemainingAtStart = (await bodyText(y.student.page)).match(/Time Remaining\s*([\d:\s]+)/i)?.[1]?.trim();
      writeState({ y: { ...yWho, answered: 2, expected: yTrack.sum(), total: xTotal, yRemainingAtStart } });

      // Wait for the time to run out, keeping the teacher active so the session is renewed silently.
      const timeline = [];
      let expired = false;
      let pollsAtZero = 0;
      while (Date.now() - startedAt < MAX_WAIT_MS && pollsAtZero < 5) {
        await y.student.page.waitForTimeout(POLL_MS);
        await user.page.mouse.move(200 + (timeline.length % 50), 300);
        await user.page
          .getByRole('button', { name: /Continue/i })
          .click({ timeout: 1000 })
          .catch(() => {});
        const yText = await bodyText(y.student.page);
        const remaining = yText.match(/Time Remaining\s*([\d:\s]+)/i)?.[1]?.trim() || '';
        // Once the clock reads zero, wait five more minutes for the site to react, then stop waiting.
        if (/^[0:\s]+$/.test(remaining)) pollsAtZero++;
        const teacherBadge = await user.player.checkpointTimerBadge.innerText({ timeout: 2000 }).catch(() => '');
        timeline.push({ min: Math.round((Date.now() - startedAt) / 60000), remaining, teacherBadge });
        writeState({ timeline });
        const stillAnswering = await y.student.questionText
          .first()
          .isVisible()
          .catch(() => false);
        const endDialog = await y.student.confirmBtn.isVisible().catch(() => false);
        if (
          !stillAnswering ||
          endDialog ||
          /time.?s up|time is up|time over|time ended|test (has )?ended/i.test(yText)
        ) {
          expired = true;
          break;
        }
      }
      if (expired) await y.student.page.waitForTimeout(15000);
      const yAfter = await bodyText(y.student.page);
      await y.student.page.screenshot({ path: test.info().outputPath('student-y-after-time-up.png') });
      await user.page.screenshot({ path: test.info().outputPath('teacher-after-time-up.png') });
      writeState({
        expiredAfterMin: Math.round((Date.now() - startedAt) / 60000),
        yAfter: yAfter.slice(0, 600),
        yEnds: yTrack.ends,
        yExpectedFinal: yTrack.sum(),
        yScoreShown: yAfter.match(/Score:\s*\d+\s*\/\s*\d+/)?.[0] || null,
        teacherAfter: (await bodyText(user.page)).slice(0, 800),
        teacherStillRunning: await user.player.checkpointEndBtn.isVisible().catch(() => false),
      });
      expect(expired, `the student's screen changed when the time ran out (screen: ${yAfter.slice(0, 200)})`).toBe(
        true
      );
      await expect(
        y.student.page.getByText(/time.?s up|time is up|time over|time ended|test (has )?ended/i).first(),
        'student Y is told the time is up'
      ).toBeVisible({ timeout: 5000 });
      await y.context.close();
    }
  );

  test(
    'CHK-11-02: the answers of a student still answering are submitted when the time runs out',
    { tag: ['@edge'] },
    async () => {
      const s = readState();
      test.skip(!s.y || !s.yAfter, 'Needs the run of CHK-11-01');
      expect(
        s.yEnds > 0 || /Score:/.test(s.yAfter) || /submitted/i.test(s.yAfter),
        `student Y's test is submitted (END requests: ${s.yEnds}; screen: ${s.yAfter.slice(0, 160)})`
      ).toBe(true);
    }
  );

  test(
    'CHK-11-03: the checkpoint is no longer running on the teacher’s side once the time is up',
    { tag: ['@edge'] },
    async ({ user }) => {
      const s = readState();
      test.skip(!s.yAfter, 'Needs the run of CHK-11-01');
      await openCheckpoint(user, TIMER);
      await user.page.waitForTimeout(3000);
      const running = await user.player.checkpointEndBtn.isVisible().catch(() => false);
      writeState({ teacherRunningOnReopen: running, teacherReopen: (await bodyText(user.page)).slice(0, 800) });
      await user.page.screenshot({ path: test.info().outputPath('teacher-reopen.png') });
      expect(running, 'the checkpoint ended by itself when its time was up').toBe(false);
    }
  );

  test(
    'CHK-11-04: the teacher’s summary counts the student whose time ran out',
    { tag: ['@regression'] },
    async ({ user }) => {
      const s = readState();
      test.skip(!s.y || !s.x, 'Needs the run of CHK-11-01');
      await openCheckpoint(user, TIMER);
      if (await user.player.checkpointEndBtn.isVisible().catch(() => false)) {
        const counts = await rosterCounts(user);
        writeState({ rosterWhileRunning: counts });
        await endCheckpoint(user);
        await expect(user.player.checkpointEndBtn).toBeHidden({ timeout: 30000 });
        await user.player.checkpointCloseBtn.click({ force: true, timeout: 5000 }).catch(() => {});
        await openCheckpoint(user, TIMER);
      }
      await expect(user.page.getByText(/\d+\s*\/\s*\d+\s*Students/).first()).toBeVisible({ timeout: 30000 });
      await user.page.waitForTimeout(2000);
      const text = await bodyText(user.page);
      writeState({ summary: text.slice(text.indexOf(TIMER.title)).slice(0, 600) });
      const attempted = text.match(/(\d+)\s*\/\s*\d+\s*Students/);
      expect(Number(attempted[1]), `both ${s.x.name} and ${s.y.name} are counted`).toBe(2);
    }
  );

  test(
    'CHK-11-05: the teacher’s average counts the student whose time ran out with the marks of their answers',
    { tag: ['@regression'] },
    async ({ user }) => {
      const s = readState();
      test.skip(!s.y || !s.x, 'Needs the run of CHK-11-01');
      await openCheckpoint(user, TIMER);
      await expect(user.page.getByText(/\d+\s*\/\s*\d+\s*Students/).first()).toBeVisible({ timeout: 30000 });
      await user.page.waitForTimeout(2000);
      const avg = (await bodyText(user.page)).match(/AVG\.?\s*SCORE:\s*(\d+)%/i);
      expect(avg, 'the summary shows an average score').not.toBeNull();
      const yExpected = s.yExpectedFinal ?? s.y.expected;
      const expected = ((100 * s.x.expected) / s.x.total + (100 * yExpected) / s.y.total) / 2;
      writeState({ teacherAvg: Number(avg[1]), expectedAvg: expected });
      expect(
        Math.abs(Number(avg[1]) - expected),
        `average shown ${avg[1]}%, expected about ${expected.toFixed(1)}%`
      ).toBeLessThanOrEqual(1);
    }
  );

  test(
    'CHK-11-06: the principal’s report scores the student whose time ran out on the answers given',
    { tag: ['@regression'] },
    async ({ app }) => {
      const s = readState();
      test.skip(!s.y || !s.x, 'Needs the run of CHK-11-01');
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
      const options = await app.plan.aflAssessmentSelect.locator('option').allInnerTexts();
      const label = options.find((o) => o.trim().toLowerCase() === TIMER.title.toLowerCase());
      expect(label, `the checkpoint is listed (options: ${options.join(' | ')})`).toBeTruthy();
      await app.plan.aflAssessmentSelect.selectOption({ label });
      await app.page.waitForTimeout(5000);
      const text = await bodyText(app.page);
      writeState({ principalReport: text.slice(text.indexOf('OVERALL MASTERY')).slice(0, 1200) });
      await app.page.screenshot({ path: test.info().outputPath('principal-report.png') });
      const yExpected = s.yExpectedFinal ?? s.y.expected;
      for (const [who, marks] of [
        [s.x, s.x.expected],
        [s.y, yExpected],
      ]) {
        const m = text.match(new RegExp(`${who.name}\\s+Section\\s+\\S+\\s+(\\d+)%`));
        expect(m, `${who.name} is listed with a percentage`).not.toBeNull();
        const expected = Math.round((100 * marks) / who.total);
        expect(
          Math.abs(Number(m[1]) - expected),
          `${who.name}: report ${m[1]}%, scored ${expected}%`
        ).toBeLessThanOrEqual(1);
      }
    }
  );
});
