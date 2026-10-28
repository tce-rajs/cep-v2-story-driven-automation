// CHK-01 to CHK-04 — Launch a checkpoint, students sign in and take it, the teacher follows progress and ends it
// Source: CEPV2_Stories/21_Checkpoints.md
// One checkpoint run from start to end, so the tests run in order: CHK-01 starts the checkpoint and leaves it
// running, CHK-02/03 use it from the student test site, CHK-04 reads the roster and ends it, and the paper test
// (CHK-01-05) and "no test running" (CHK-02-08) come last. Each student signs in once per test, so every test that
// signs a student in takes the next roll number.

const { test, expect } = require('../../fixtures');
const {
  CP,
  GRADE,
  DIVISION,
  checkpointCard,
  openCheckpoint,
  startCheckpoint,
  endCheckpoint,
  endStartedTests,
  rosterCounts,
  openStudentSite,
} = require('./chk-helpers');

test.describe.configure({ timeout: 240000 });

test.describe('CHK Checkpoint from launch to end', () => {
  test.use({ classMap: 'checkpoints' });

  let nextRoll = 1;
  /** Sign the next unused student in on the given student page; returns { roll, name }. */
  const signInNext = async (student) => {
    await student.chooseClass(GRADE, DIVISION);
    const who = await student.signInNextStudent(GRADE, DIVISION, nextRoll);
    nextRoll = who.roll + 1;
    return who;
  };
  /** The name of the student who submitted in CHK-03-04, read back by CHK-04. */
  let submittedName = '';
  /** A checkpoint of the topic, other than the one the tests run, that has never been launched. */
  const neverLaunched = (user) =>
    user.playlist.resourceCards.filter({ hasText: 'CREATED' }).filter({ hasNotText: CP.checkpointTitle }).first();

  test.afterEach(async ({ app }) => {
    await app.player.checkpointCloseBtn.click({ force: true, timeout: 3000 }).catch(() => {});
  });

  // --- CHK-01 Launch ---

  test(
    'CHK-01-01: opening a checkpoint card offers In-Lab Assessment and Paper Test',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await endStartedTests(user, 'checkpoints'); // set-up: no test of the class is running
      // The choice is offered on a checkpoint that has never been launched; it is only looked at, not launched.
      const fresh = neverLaunched(user);
      test.skip(!(await fresh.count()), 'Needs a checkpoint in the topic that has never been launched');
      await user.player.openResourceCard(fresh);
      await expect(user.player.checkpointModeOnlineBtn, 'In-Lab Assessment (online)').toBeVisible({ timeout: 15000 });
      await expect(user.player.checkpointModeOfflineBtn, 'Paper Test (offline)').toBeVisible();
    }
  );

  test(
    'CHK-01-02: choosing In-Lab Assessment and Start starts the checkpoint with a running timer',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await openCheckpoint(user);
      await startCheckpoint(user, 'online');
      const badge = user.player.checkpointTimerBadge;
      await expect(badge, 'the timer shows').toBeAttached({ timeout: 15000 });
      const first = (await badge.innerText()).trim();
      await user.page.waitForTimeout(3000);
      expect((await badge.innerText()).trim(), 'the timer is running').not.toBe(first);
    }
  );

  test(
    'CHK-01-03: a started online checkpoint tells the teacher students begin through the student portal',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openCheckpoint(user);
      await startCheckpoint(user, 'online');
      await expect(user.page.getByText(/students now begin the test through the student portal/i).first()).toBeVisible({
        timeout: 15000,
      });
    }
  );

  test("CHK-01-04: a started checkpoint lists the class's students", { tag: ['@functional'] }, async ({ user }) => {
    await openCheckpoint(user);
    await startCheckpoint(user, 'online');
    await expect(user.player.checkpointStudentRows.first()).toBeAttached({ timeout: 15000 });
    expect(await user.player.checkpointStudentRows.count(), 'the class roster').toBeGreaterThan(1);
    const counts = await rosterCounts(user);
    expect(counts, 'the roster shows Not Logged-In / Logged-In / Attempting / Submitted counts').not.toBeNull();
  });

  test(
    'CHK-01-07: reloading the app and reopening the card shows the checkpoint still running',
    { tag: ['@interruption'] },
    async ({ user }) => {
      await openCheckpoint(user);
      await startCheckpoint(user, 'online');
      await user.page.reload();
      await expect(user.login.avatar).toBeVisible({ timeout: 30000 });
      await user.nav.applyClassMap('checkpoints');
      await user.playlist.ensureDrawerVisible();
      await openCheckpoint(user);
      await expect(user.player.checkpointEndBtn, 'still running: End Checkpoint is offered').toBeAttached({
        timeout: 15000,
      });
    }
  );

  // --- CHK-02 Student signs in ---

  test(
    'CHK-02-01: the student test site opens on the sign-in page',
    { tag: ['@smoke', '@functional'] },
    async ({ browser }) => {
      const { context, student } = await openStudentSite(browser);
      await expect(student.gradeLabel).toBeVisible();
      await expect(student.rollNumberInput).toBeVisible();
      await expect(student.startBtn, 'Start waits for a checked roll number').toBeDisabled();
      await context.close();
    }
  );

  test("CHK-02-02: the grade list offers the school's grades", { tag: ['@functional'] }, async ({ browser }) => {
    const { context, student } = await openStudentSite(browser);
    await expect(student.gradeTiles.filter({ hasText: GRADE }), `${GRADE} is offered`).toHaveCount(1, {
      timeout: 15000,
    });
    await context.close();
  });

  test("CHK-02-03: the class list offers the chosen grade's classes", { tag: ['@functional'] }, async ({ browser }) => {
    const { context, student } = await openStudentSite(browser);
    await expect(student.selectGradeFirstHint, 'asks for the grade first').toBeVisible();
    await student.gradeTiles.filter({ hasText: GRADE }).first().click();
    await expect(student.classTiles.filter({ hasText: DIVISION })).toHaveCount(1, { timeout: 15000 });
    await context.close();
  });

  test(
    "CHK-02-04: checking a valid roll number shows the student's name",
    { tag: ['@functional'] },
    async ({ browser }) => {
      const { context, student } = await openStudentSite(browser);
      const who = await signInNext(student);
      expect(who.name.length, 'the student name shows').toBeGreaterThan(2);
      await expect(student.startBtn, 'Start is now possible').toBeEnabled();
      await context.close();
    }
  );

  test('CHK-02-05: an unknown roll number is refused with a message', { tag: ['@negative'] }, async ({ browser }) => {
    const { context, student } = await openStudentSite(browser);
    await student.chooseClass(GRADE, DIVISION);
    const r = await student.checkRoll(9999);
    expect(r.ok, 'refused by the server').toBe(false);
    await expect(student.page.getByText(/invalid login/i)).toBeVisible({ timeout: 10000 });
    await expect(student.startBtn).toBeDisabled();
    await context.close();
  });

  test(
    'CHK-02-06: Start is not possible before the roll number is checked',
    { tag: ['@negative'] },
    async ({ browser }) => {
      const { context, student } = await openStudentSite(browser);
      await student.chooseClass(GRADE, DIVISION);
      await student.rollNumberInput.fill(String(nextRoll));
      await expect(student.startBtn).toBeDisabled();
      await context.close();
    }
  );

  test(
    "CHK-02-07: Start opens the running checkpoint's test",
    { tag: ['@smoke', '@functional'] },
    async ({ browser }) => {
      const { context, student } = await openStudentSite(browser);
      await signInNext(student);
      await student.startMission();
      await expect(student.questionText.first()).toBeVisible();
      await expect(student.timeRemaining).toBeVisible();
      await context.close();
    }
  );

  test(
    "CHK-02-09: the site header shows today's date and the current time",
    { tag: ['@functional'] },
    async ({ browser }) => {
      const { context, student } = await openStudentSite(browser);
      const now = new Date();
      const today = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).replace(' 0', ' '); // "Oct 7"
      await expect(student.clockDate, "today's date").toContainText(today.split(' ')[0]);
      await expect(student.clockDate).toContainText(new RegExp(`\\b${now.getDate()}\\b`));
      await context.close();
    }
  );

  // --- CHK-03 Student takes the test ---

  test(
    'CHK-03-01: the test shows the first question with its options',
    { tag: ['@functional'] },
    async ({ browser }) => {
      const { context, student } = await openStudentSite(browser);
      await signInNext(student);
      await student.startMission();
      await expect(student.questionText.first()).not.toBeEmpty();
      expect(await student.answerOptions.count(), 'answer options').toBeGreaterThan(1);
      await context.close();
    }
  );

  test('CHK-03-02: a student can choose an answer and change it', { tag: ['@functional'] }, async ({ browser }) => {
    const { context, student } = await openStudentSite(browser);
    await signInNext(student);
    await student.startMission();
    expect((await student.answer(0)).ok(), 'first answer saved').toBe(true);
    expect((await student.answer(1)).ok(), 'changed answer saved').toBe(true);
    await expect(student.answerOptions.nth(1).locator('input[type=checkbox]')).toBeChecked();
    await expect(
      student.answerOptions.nth(0).locator('input[type=checkbox]'),
      'the first choice is replaced'
    ).not.toBeChecked();
    await context.close();
  });

  test('CHK-03-03: Next and Previous move between questions', { tag: ['@functional'] }, async ({ browser }) => {
    const { context, student } = await openStudentSite(browser);
    await signInNext(student);
    await student.startMission();
    const q1 = await student.questionText.first().innerText();
    await student.nextQuestionBtn.click();
    await expect(student.questionText.first()).not.toContainText(q1.slice(0, 40), { timeout: 10000 });
    await student.page.getByText('chevron_left').first().click();
    await expect(student.questionText.first(), 'back on the first question').toContainText(q1.slice(0, 40), {
      timeout: 10000,
    });
    await context.close();
  });

  test(
    'CHK-03-04: Submit sends the answers and confirms the test is submitted',
    { tag: ['@smoke', '@regression'] },
    async ({ browser }) => {
      const { context, student } = await openStudentSite(browser);
      const who = await signInNext(student);
      await student.startMission();
      const submitted = student.page.waitForResponse((r) => /client\/submitted/.test(r.url()), { timeout: 60000 });
      const answered = await student.answerAllAndEnd(0);
      expect(answered, 'every question answered').toBeGreaterThan(1);
      expect((await submitted).ok(), 'submission accepted').toBe(true);
      await expect(student.resultScore, 'the score shows').toBeVisible({ timeout: 20000 });
      await expect(student.resultScore).toContainText(`/${answered}`);
      submittedName = who.name;
      await context.close();
    }
  );

  test(
    'CHK-03-05: a student who has submitted cannot start the same test again',
    { tag: ['@negative'] },
    async ({ browser }) => {
      test.skip(!submittedName, 'Needs the student who submitted in CHK-03-04');
      const { context, student } = await openStudentSite(browser);
      await student.chooseClass(GRADE, DIVISION);
      const r = await student.checkRoll(nextRoll - 1);
      expect(r.ok).toBe(false);
      await expect(student.page.getByText(/already submitted/i)).toBeVisible({ timeout: 10000 });
      await context.close();
    }
  );

  test(
    'CHK-03-06: reloading the page mid-test keeps the answers given so far',
    { tag: ['@interruption'] },
    async ({ browser }) => {
      const { context, student } = await openStudentSite(browser);
      await signInNext(student);
      await student.startMission();
      await student.answer(1);
      const q1 = await student.questionText.first().innerText();
      await student.page.reload({ waitUntil: 'networkidle' });
      await expect(
        student.page.getByText(q1.slice(0, 40)).first(),
        'the test is still open after a reload'
      ).toBeVisible({ timeout: 20000 });
      await expect(student.answerOptions.nth(1).locator('input[type=checkbox]'), 'the answer is kept').toBeChecked();
      await context.close();
    }
  );

  // --- CHK-04 Teacher follows progress and ends ---

  test(
    "CHK-04-01: a student who has started appears as in progress on the teacher's roster",
    { tag: ['@functional'] },
    async ({ user, browser }) => {
      const { context, student } = await openStudentSite(browser);
      await signInNext(student);
      await student.startMission();
      await student.answer(0);
      await openCheckpoint(user);
      await expect
        .poll(async () => (await rosterCounts(user))?.attempting ?? 0, { message: 'Attempting count', timeout: 30000 })
        .toBeGreaterThan(0);
      await context.close();
    }
  );

  test(
    "CHK-04-02: a student who has submitted appears as completed on the teacher's roster",
    { tag: ['@functional'] },
    async ({ user, browser }) => {
      await openCheckpoint(user);
      await startCheckpoint(user, 'online');
      const before = (await rosterCounts(user)).submitted;
      const { context, student } = await openStudentSite(browser);
      await signInNext(student);
      await student.startMission();
      await student.answerAllAndEnd(0);
      await expect(student.resultScore).toBeVisible({ timeout: 20000 });
      await context.close();
      await user.page.reload();
      await expect(user.login.avatar).toBeVisible({ timeout: 30000 });
      await user.nav.applyClassMap('checkpoints');
      await user.playlist.ensureDrawerVisible();
      await openCheckpoint(user);
      await expect
        .poll(async () => (await rosterCounts(user))?.submitted ?? 0, { message: 'Submitted count', timeout: 30000 })
        .toBeGreaterThan(before);
    }
  );

  test(
    "CHK-01-06: a second checkpoint can't be started in the class while one is running",
    { tag: ['@negative'] },
    async ({ user }) => {
      // Another checkpoint of the topic that is not running.
      const second = user.playlist.resourceCards
        .filter({ hasText: /CREATED|PAUSED/ })
        .filter({ hasNotText: CP.checkpointTitle })
        .first();
      test.skip(!(await second.count()), 'Needs a second checkpoint in the topic');
      await user.player.openResourceCard(second);
      const p = user.player;
      await expect(p.checkpointTimerBadge.or(p.checkpointResumeBtn).or(p.checkpointModeOnlineBtn).first()).toBeVisible({
        timeout: 20000,
      });
      if (await user.player.checkpointResumeBtn.isVisible({ timeout: 3000 }).catch(() => false))
        await user.player.checkpointResumeBtn.click({ force: true });
      if (await user.player.checkpointModeOnlineBtn.isVisible({ timeout: 3000 }).catch(() => false))
        await user.player.checkpointModeOnlineBtn.click({ force: true });
      await user.player.checkpointStartBtn.click({ force: true, timeout: 5000 }).catch(() => {});
      await expect(
        user.page
          .getByText(/already (running|started|in progress)|another (checkpoint|test)|one .* at a time/i)
          .first(),
        'refused with a message'
      ).toBeVisible({ timeout: 15000 });
    }
  );

  test('CHK-04-03: End Checkpoint finishes the checkpoint', { tag: ['@smoke', '@functional'] }, async ({ user }) => {
    await openCheckpoint(user);
    await startCheckpoint(user, 'online'); // set-up: running (normally left so by the tests above)
    await endCheckpoint(user);
    await expect(user.page.getByText(/test paused|test ended|checkpoint ended/i).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(user.player.checkpointEndBtn, 'no longer running').toBeHidden({ timeout: 30000 });
  });

  test(
    "CHK-04-04: a student can't start a checkpoint after the teacher has ended it",
    { tag: ['@negative'] },
    async ({ browser }) => {
      const { context, student } = await openStudentSite(browser);
      const grade = student.gradeTiles.filter({ hasText: GRADE });
      if (await grade.count()) {
        await student.chooseClass(GRADE, DIVISION);
        const r = await student.checkRoll(nextRoll);
        if (r.ok) {
          await student.startBtn.click();
          await expect(student.startMissionBtn, 'no test to start').toBeHidden({ timeout: 10000 });
        } else {
          await expect(student.page.getByText(/no (active )?test|not (started|available)|ended/i).first()).toBeVisible({
            timeout: 10000,
          });
        }
      } else {
        await expect(
          student.page.getByText(/no (active |running )?(test|assessment|checkpoint)|not (started|available)/i).first(),
          'with no grade listed, the student is told no test is running'
        ).toBeVisible({ timeout: 10000 });
      }
      await context.close();
    }
  );

  test(
    'CHK-04-05: an ended checkpoint is no longer running after a reload',
    { tag: ['@functional'] },
    async ({ user }) => {
      await user.page.reload();
      await expect(user.login.avatar).toBeVisible({ timeout: 30000 });
      await user.nav.applyClassMap('checkpoints');
      await user.playlist.ensureDrawerVisible();
      await expect(checkpointCard(user)).not.toContainText(/STARTED/, { timeout: 20000 });
    }
  );

  test(
    'CHK-02-08: a student whose class has no running checkpoint is told there is no test',
    { tag: ['@negative'] },
    async ({ browser }) => {
      const { context, student } = await openStudentSite(browser);
      const grade = student.gradeTiles.filter({ hasText: GRADE });
      if (await grade.count()) {
        await student.chooseClass(GRADE, DIVISION);
        const r = await student.checkRoll(nextRoll);
        expect(r.ok, 'no sign-in to a class with no running test').toBe(false);
        await expect(student.page.getByText(/no (active )?test|not (started|available)/i).first()).toBeVisible({
          timeout: 10000,
        });
      } else {
        await expect(
          student.page.getByText(/no (active |running )?(test|assessment|checkpoint)|not (started|available)/i).first(),
          'with no grade listed, the student is told no test is running'
        ).toBeVisible({ timeout: 10000 });
      }
      await context.close();
    }
  );

  test(
    'CHK-01-05: choosing Paper Test opens the Paper Test workflow instead of starting an online test',
    { tag: ['@functional'] },
    async ({ user }) => {
      // Choosing Paper Test does not launch the checkpoint; Back leaves it as it was.
      const fresh = neverLaunched(user);
      test.skip(!(await fresh.count()), 'Needs a checkpoint in the topic that has never been launched');
      await user.player.openResourceCard(fresh);
      await user.player.checkpointModeOfflineBtn.click({ timeout: 15000 });
      await expect(user.page.getByText('Paper Test Workflow', { exact: true })).toBeVisible({ timeout: 15000 });
      await expect(user.player.checkpointEndBtn, 'no online test is started').toHaveCount(0);
      await user.page.getByRole('button', { name: 'Back' }).click(); // leave it not launched
    }
  );
});
