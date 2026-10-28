// CHK-06 — Edge cases and interruptions during a checkpoint
// Source: CEPV2_Stories/21_Checkpoints.md
// Runs on the class map's 'edgeCheckpoint'.
// The first test makes sure the checkpoint is running; the student tests use it; the teacher-ends-mid-test cases come
// last and leave the checkpoint ended. Every test that signs a student in takes the next roll number that can sign in.

const { test, expect } = require('../../fixtures');
const {
  CP,
  GRADE,
  DIVISION,
  openCheckpoint,
  startCheckpoint,
  endCheckpoint,
  endIfRunning,
  endStartedTests,
  rosterCounts,
  openStudentSite,
} = require('./chk-helpers');

test.describe.configure({ timeout: 360000 });

// The checkpoint reserved for these cases (a roll number can sign in to a checkpoint only once). CHK06_CHECKPOINT
// ("title|questions", e.g. "test 2|10 Q") runs them on another online checkpoint that still has free roll numbers.
const [overrideTitle, overrideQuestions] = (process.env.CHK06_CHECKPOINT || '').split('|');
const EDGE = overrideTitle ? { title: overrideTitle, questions: overrideQuestions } : CP.edgeCheckpoint;

test.describe('CHK-06 Edge cases and interruptions during a checkpoint', () => {
  test.use({ classMap: 'checkpoints' });

  let nextRoll = 1;
  const signInNext = async (student) => {
    await student.chooseClass(GRADE, DIVISION);
    const who = await student.signInNextStudent(GRADE, DIVISION, nextRoll);
    nextRoll = who.roll + 1;
    return who;
  };

  test.afterEach(async ({ app }) => {
    await app.player.checkpointCloseBtn.click({ force: true, timeout: 3000 }).catch(() => {});
  });

  test('set-up: the checkpoint is running', async ({ user }) => {
    await endStartedTests(user, 'checkpoints'); // no other test of the class is running
    await openCheckpoint(user, EDGE);
    await startCheckpoint(user, 'online');
  });

  test(
    'CHK-06-01: End Mission with unanswered questions warns how many are unanswered',
    { tag: ['@negative'] },
    async ({ browser }) => {
      const { context, student } = await openStudentSite(browser);
      await signInNext(student);
      await student.startMission();
      await student.answer(0); // one answered, the rest left unanswered
      await student.endMissionBtn.click();
      await expect(student.confirmBtn).toBeVisible({ timeout: 10000 });
      const dialog = student.page.locator('mat-dialog-container, .cdk-overlay-pane, [role=dialog]').last();
      await expect(dialog, 'the warning says questions are unanswered').toContainText(
        /unanswered|not attempted|un-attempted|\d+\s*(of|\/)\s*\d+|left/i
      );
      await student.cancelBtn.click(); // the student stays in the test
      await expect(student.questionText.first()).toBeVisible();
      await context.close();
    }
  );

  test(
    'CHK-06-04: a student who logs out mid-test can sign in again and continue',
    { tag: ['@interruption'] },
    async ({ browser }) => {
      const first = await openStudentSite(browser);
      const who = await signInNext(first.student);
      await first.student.startMission();
      await first.student.answer(0);
      await first.student.logOutBtn.click();
      await first.student.page
        .getByRole('button', { name: /yes|confirm|log ?out/i })
        .last()
        .click({ timeout: 5000 })
        .catch(() => {});
      await first.context.close();
      const again = await openStudentSite(browser);
      await again.student.chooseClass(GRADE, DIVISION);
      const r = await again.student.checkRoll(who.roll);
      expect(r.ok, `roll ${who.roll} can sign in again (server said: ${r.body.errorMessage || r.status})`).toBe(true);
      await again.context.close();
    }
  );

  test(
    'CHK-06-05: the same roll number cannot sign in on a second device while the first is taking the test',
    { tag: ['@concurrency'] },
    async ({ browser }) => {
      const first = await openStudentSite(browser);
      const who = await signInNext(first.student);
      await first.student.startMission();
      const second = await openStudentSite(browser);
      await second.student.chooseClass(GRADE, DIVISION);
      const r = await second.student.checkRoll(who.roll);
      expect(r.ok, 'the second device is refused').toBe(false);
      await expect(second.student.page.getByText(/already/i).first(), 'with a message').toBeVisible({ timeout: 10000 });
      await expect(first.student.questionText.first(), 'the first device is unaffected').toBeVisible();
      await first.context.close();
      await second.context.close();
    }
  );

  test('CHK-06-06: double-clicking Confirm on End Mission submits once', { tag: ['@edge'] }, async ({ browser }) => {
    const { context, student } = await openStudentSite(browser);
    await signInNext(student);
    await student.startMission();
    let ends = 0;
    student.page.on('request', (r) => {
      if (/client\/attempts/.test(r.url()) && /"END"/.test(r.postData() || '')) ends++;
    });
    for (let i = 0; i < 60; i++) {
      await student.answer(0);
      if (!(await student.nextQuestionBtn.isVisible())) break;
      await student.nextQuestionBtn.click();
      await student.page.waitForTimeout(800);
    }
    await student.endMissionBtn.click();
    await student.confirmBtn.dblclick();
    await expect(student.resultScore).toBeVisible({ timeout: 20000 });
    await student.page.waitForTimeout(2000);
    expect(ends, 'one END request').toBe(1);
    await context.close();
  });

  test(
    'CHK-06-07: the roll number tick is disabled while the roll number is empty',
    { tag: ['@negative'] },
    async ({ browser }) => {
      const { context, student } = await openStudentSite(browser);
      await student.chooseClass(GRADE, DIVISION);
      await student.rollNumberInput.fill('');
      await expect(student.checkRollBtn).toBeDisabled();
      await expect(student.startBtn).toBeDisabled();
      await context.close();
    }
  );

  test(
    'CHK-06-08: a roll number with a leading zero or spaces is treated as the same roll number or refused with a clear message',
    { tag: ['@edge'] },
    async ({ browser }) => {
      // Find a roll number that can sign in, then try its padded form in a fresh session.
      const probe = await openStudentSite(browser);
      await probe.student.chooseClass(GRADE, DIVISION);
      const roll = nextRoll;
      for (const typed of [` ${roll} `, `0${roll}`]) {
        const r = await probe.student.checkRoll(typed);
        if (r.ok) {
          await expect(probe.student.studentName, `"${typed}" signs in a named student`).toHaveText(/\S/);
          nextRoll = roll + 1;
          break;
        }
        const message = r.body.errorMessage || '';
        expect(message, `"${typed}" is refused with a clear message`).not.toMatch(/^$|error|exception|null|undefined/i);
        await probe.student.messageOkBtn.click().catch(() => {});
      }
      await probe.context.close();
    }
  );

  test(
    'CHK-06-09: going back to an answered question shows the answer chosen',
    { tag: ['@functional'] },
    async ({ browser }) => {
      const { context, student } = await openStudentSite(browser);
      await signInNext(student);
      await student.startMission();
      await student.answer(2);
      await student.nextQuestionBtn.click();
      await student.page.waitForTimeout(1000);
      await student.page.getByText('chevron_left').first().click();
      await expect(
        student.answerOptions.nth(2).locator('input[type=checkbox]'),
        'the answer is still chosen'
      ).toBeChecked({
        timeout: 10000,
      });
      await context.close();
    }
  );

  test(
    'CHK-06-10: the question number buttons jump to that question',
    { tag: ['@functional'] },
    async ({ browser }) => {
      const { context, student } = await openStudentSite(browser);
      await signInNext(student);
      await student.startMission();
      const q1 = await student.questionText.first().innerText();
      await student.pageButtons
        .filter({ hasText: /^\s*3\s*$/ })
        .first()
        .click();
      await expect(student.questionText.first()).not.toContainText(q1.slice(0, 40), { timeout: 10000 });
      await student.pageButtons
        .filter({ hasText: /^\s*1\s*$/ })
        .first()
        .click();
      await expect(student.questionText.first(), 'back on question 1').toContainText(q1.slice(0, 40), {
        timeout: 10000,
      });
      await context.close();
    }
  );

  test(
    'CHK-06-11: a skipped question is shown as Not Attempted in the question panel',
    { tag: ['@functional'] },
    async ({ browser }) => {
      const { context, student } = await openStudentSite(browser);
      await signInNext(student);
      await student.startMission();
      await student.nextQuestionBtn.click(); // skip question 1
      await student.answer(0); // answer question 2
      await student.nextQuestionBtn.click();
      await student.page.waitForTimeout(1500);
      const panel = student.page.locator('body');
      await expect(panel, 'the panel lists Not Attempted questions').toContainText(/Not Attempted/);
      await context.close();
    }
  );

  test(
    "CHK-06-02: the teacher ending the checkpoint while a student is answering saves the student's answers",
    { tag: ['@interruption'] },
    async ({ user, browser }) => {
      const { context, student } = await openStudentSite(browser);
      await signInNext(student);
      await student.startMission();
      expect((await student.answer(0)).ok(), 'an answer was saved before the end').toBe(true);
      await openCheckpoint(user, EDGE);
      await startCheckpoint(user, 'online');
      const before = await rosterCounts(user);
      await endCheckpoint(user);
      await expect(user.page.getByText(/test paused|test ended|checkpoint ended/i).first()).toBeVisible({
        timeout: 15000,
      });
      // The student mid-test is counted as attempted in the teacher's summary.
      await user.page.reload();
      await expect(user.login.avatar).toBeVisible({ timeout: 30000 });
      await user.nav.applyClassMap('checkpoints');
      await user.playlist.ensureDrawerVisible();
      await openCheckpoint(user, EDGE);
      // The summary shows "Loading..." until its numbers arrive.
      await expect(user.page.getByText(/\d+\s*\/\s*\d+\s*Students/).first()).toBeVisible({ timeout: 30000 });
      const attempted = (await user.page.locator('body').innerText()).match(/(\d+)\s*\/\s*\d+\s*Students/);
      expect(attempted, 'the summary shows how many attempted').not.toBeNull();
      expect(Number(attempted[1]), 'the student who was answering is counted').toBeGreaterThan(
        before ? before.submitted : 0
      );

      // CHK-06-03 is checked on the same student: their screen after the end.
      await student.answerLabels
        .first()
        .click({ force: true, timeout: 5000 })
        .catch(() => {});
      test.info().annotations.push({
        type: 'note',
        description: `Student screen after the end: ${(await student.page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 200)}`,
      });
      await context.close();
    }
  );

  test(
    'CHK-06-03: a student answering when the teacher ends the checkpoint is told the test has ended',
    { tag: ['@interruption'] },
    async ({ user, browser }) => {
      await openCheckpoint(user, EDGE);
      await startCheckpoint(user, 'online');
      const { context, student } = await openStudentSite(browser);
      await signInNext(student);
      await student.startMission();
      await student.answer(0);
      await openCheckpoint(user, EDGE);
      await endCheckpoint(user);
      await expect(
        student.page.getByText(/test (has )?ended|time.?s up|paused|submitted|mission (complete|ended)/i).first(),
        'the student is told'
      ).toBeVisible({ timeout: 60000 });
      await context.close();
    }
  );

  test(
    'CHK-06-12: resuming a paused checkpoint keeps students who submitted as Submitted',
    { tag: ['@functional'] },
    async ({ user }) => {
      await endIfRunning(user, EDGE);
      await openCheckpoint(user, EDGE);
      const summary = (await user.page.locator('body').innerText()).match(/(\d+)\s*\/\s*\d+\s*Students/);
      await startCheckpoint(user, 'online');
      const counts = await rosterCounts(user);
      expect(counts, 'roster counts shown').not.toBeNull();
      expect(counts.submitted, 'students who submitted before the pause are still Submitted').toBeGreaterThan(0);
      if (summary) expect(counts.submitted).toBeLessThanOrEqual(Number(summary[1]));
      await endCheckpoint(user); // clean-up: leave it ended
    }
  );
});
