// FLOW-19 — Taking attendance
// Source: CEPV2_Stories/00_EndToEndFlows.md
// Data: 'attendance' (Class 10A Science, the class whose attendance the suite already marks and submits every run);
// every other class is read only. FLOW-19-07 reads the principal's reports (PRINCIPAL_PIN). FLOW-19-11 (every class)
// is in flow-17-19-every-class.spec.js; FLOW-19-13 (a change made in the Teacher application) is a hand-off.
// FLOW-19-09 (the Admin cut-off time) is not automated: the cut-off cannot be read in the classroom, and the Admin
// setting belongs to the live school, so the test cannot set one.

const { test, expect } = require('../../fixtures');
const { switchTeacher } = require('./flow-helpers');

const isSubmit = (req) => req.method() === 'POST' && /content\/file/i.test(req.url());
const today = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); // e.g. "9 Oct"

test.use({ classMap: 'attendance' });

test.describe('FLOW-19 Taking attendance', () => {
  test.describe.configure({ timeout: 240000 });

  test.afterEach(async ({ app }) => {
    await app.page.unroute('**/*').catch(() => {});
    await app.attendance.closeAll();
  });

  test(
    'FLOW-19-01: the register lists every student of the class',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const a = user.attendance;
      await a.open(user.magnet);
      await a.startMarking();
      const { total } = await a.gridCounts();
      const summary = await a.summary();
      expect(total, 'students are listed').toBeGreaterThan(0);
      expect(total, 'every student in the class total is listed').toBe(summary.total.t);
      const rolls = (await a.cells.allInnerTexts()).map((t) => Number(t.trim()));
      expect(new Set(rolls).size, 'each student once').toBe(total);
    }
  );

  test(
    'FLOW-19-02: students can be marked present or absent, and all at once',
    { tag: ['@functional'] },
    async ({ user }) => {
      const a = user.attendance;
      await a.open(user.magnet);
      await a.startMarking();
      await a.markAllPresent();
      await expect
        .poll(async () => (await a.gridCounts()).present, { message: 'all present at once' })
        .toBe((await a.gridCounts()).total);
      await a.tap(0);
      expect(await a.cellState(0), 'a student marked absent').toBe('absent');
      await a.tap(0);
      expect(await a.cellState(0), 'and present again').toBe('present');
    }
  );

  test(
    'FLOW-19-03: Play Attendance (roll call) marks students one by one',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const a = user.attendance;
      await a.open(user.magnet);
      const playable = (await a.hasDraft()) || (await a.playBtn.isVisible().catch(() => false));
      test.skip(
        !playable,
        "Today's attendance is already submitted: Play Attendance is offered only before the first submit."
      );
      if (await a.hasDraft()) await a.resumeBtn.click();
      else await a.playBtn.click({ force: true });
      await expect(a.carouselItems.first(), 'the roll call starts').toBeVisible({ timeout: 15000 });
      const first = await a.activeRollNumber.innerText().catch(() => '');
      await expect
        .poll(async () => a.activeRollNumber.innerText().catch(() => ''), {
          message: 'it moves on to the next student by itself',
          timeout: 20000,
        })
        .not.toBe(first);
      await page.waitForTimeout(500);
    }
  );

  test(
    'FLOW-19-04: submitting saves the attendance and shows a confirmation',
    { tag: ['@smoke', '@functional'] },
    async ({ user, page }) => {
      const a = user.attendance;
      await a.open(user.magnet);
      await a.startMarking();
      await a.markExactlyAbsent([2, 5]);
      await a.done();
      const saved = page.waitForResponse((r) => isSubmit(r.request()), { timeout: 30000 });
      await a.submitBtn.filter({ visible: true }).first().click({ force: true });
      expect((await saved).ok(), 'the attendance is saved').toBe(true);
      await expect(
        page
          .locator('mat-snack-bar-container, .toast-container, [role="alert"]')
          .or(page.getByText(/submitted|saved successfully|attendance (is )?(marked|taken)/i))
          .filter({ visible: true })
          .first(),
        'a confirmation'
      ).toBeVisible({ timeout: 15000 });
    }
  );

  test(
    'FLOW-19-05: the submitted attendance shows the same when opened again',
    { tag: ['@functional'] },
    async ({ user }) => {
      const a = user.attendance;
      await a.recordAttendance(user.magnet, [4, 9]);
      await a.closeAll();
      await a.open(user.magnet);
      await a.startMarking();
      await expect.poll(() => a.absentRolls(), { message: 'the same students absent', timeout: 20000 }).toEqual([4, 9]);
    }
  );

  test(
    'FLOW-19-06: a submitted attendance can be edited and the change is kept',
    { tag: ['@functional'] },
    async ({ user }) => {
      const a = user.attendance;
      await a.recordAttendance(user.magnet, [4]);
      await a.closeAll();
      // Edit: roll 6 is absent too.
      await a.recordAttendance(user.magnet, [4, 6]);
      await a.closeAll();
      await a.open(user.magnet);
      await a.startMarking();
      await expect.poll(() => a.absentRolls(), { message: 'the edit is kept', timeout: 20000 }).toEqual([4, 6]);
    }
  );

  test('FLOW-19-07: attendance shows in the reports', { tag: ['@functional'] }, async ({ user, page }) => {
    test.skip(!process.env.PRINCIPAL_PIN, 'needs the principal account (PRINCIPAL_PIN in .env)');
    await user.attendance.recordAttendance(user.magnet, [3]);
    await user.attendance.closeAll();
    await switchTeacher(user, process.env.PRINCIPAL_PIN);
    const { switched } = await user.compass.switchToPlanningMode();
    expect(switched, 'set-up: Plan Mode opened for the principal').toBe(true);
    await user.plan.reportsLink.first().click({ force: true });
    await user.plan.reportTabs.first().waitFor({ timeout: 20000 });
    const tabs = (await user.plan.reportTabs.allInnerTexts()).map((t) => t.trim());
    const tab = tabs.find((t) => /attendance/i.test(t));
    expect(tab, `an attendance report among the reports (${tabs.join(', ')})`).toBeTruthy();
    await user.plan.reportTab(tab).click({ force: true });
    await page.waitForTimeout(4000);
    await expect(page.getByText(/Class\s*10\s*-?\s*A|10\s*A/).first(), 'Class 10 A’s attendance').toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText(new RegExp(today(), 'i')).first(), 'for today').toBeVisible();
  });

  test(
    'FLOW-19-08: leaving before submitting warns that nothing was saved',
    { tag: ['@negative'] },
    async ({ user }) => {
      const a = user.attendance;
      await a.open(user.magnet);
      await a.startMarking();
      await a.tap(0);
      await a.closeBtn.first().click({ force: true });
      await expect(a.closeDialog, 'a warning before leaving').toBeVisible({ timeout: 5000 });
      await expect(a.closeDialog, 'it says the marks are not saved').toContainText(
        /not (be )?saved|lose|unsaved|discard|submit/i
      );
      await a.closeDialogCancelBtn.click({ force: true });
    }
  );

  test(
    'FLOW-19-10: a network failure while submitting shows a message and does not lose the marks',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const a = user.attendance;
      await a.open(user.magnet);
      await a.startMarking();
      await a.markExactlyAbsent([7]);
      await page.route('**/*', (route) =>
        isSubmit(route.request()) ? route.abort('internetdisconnected') : route.continue()
      );
      if (await a.doneBtn.isVisible().catch(() => false)) await a.doneBtn.click({ force: true });
      await a.submitBtn.filter({ visible: true }).first().click({ force: true });
      await expect(
        page.getByText(/fail|error|could not|couldn.t|unable|try again|network|offline/i).first(),
        'a message that it was not submitted'
      ).toBeVisible({ timeout: 15000 });
      await expect(a.container, 'the register stays open').toBeVisible();
      if (await a.editBtn.filter({ visible: true }).count())
        await a.editBtn.filter({ visible: true }).first().click({ force: true });
      expect(await a.absentRolls(), 'the marks are kept').toEqual([7]);
    }
  );

  test(
    'FLOW-19-12: a submitted, locked day shows who was present and absent (never an empty locked register)',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const a = user.attendance;
      await a.open(user.magnet);
      const empty = [];
      let locked = 0;
      for (let d = 1; d <= 3; d++) {
        await a.prevDayBtn.click({ force: true });
        await page.waitForTimeout(2500);
        if (!(await a.lockedNotice.isVisible().catch(() => false))) continue;
        locked++;
        const date = ((await a.container.innerText()).match(/\w{3}, \d+ \w{3} \d{4}/) || [`day -${d}`])[0];
        const g = await a.gridCounts();
        if (g.total === 0 || g.unmarked === g.total) empty.push(date);
      }
      test.skip(locked === 0, 'no submitted (locked) day in the last three days to look at');
      expect(empty, 'every locked day shows who was present and absent').toEqual([]);
    }
  );
});
