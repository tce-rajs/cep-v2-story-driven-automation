// ATT-07 — Attendance data is correct and kept
// Source: CEPV2_Stories/16_Attendance.md
// Real submits: each writes today's attendance for Class 10A (the register is shared by all its subjects).

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'attendance' });

const ABSENT = [3, 7, 15];
const isSubmit = (req) => req.method() === 'POST' && /content\/file/i.test(req.url());

test.describe('ATT-07 Attendance data is correct and kept', () => {
  test.describe.configure({ timeout: 240000 });

  test.afterEach(async ({ app }) => {
    await app.attendance.closeAll();
  });

  test(
    'ATT-07-01: marking rolls 3, 7 and 15 absent shows 27 present / 3 absent and names exactly those rolls',
    { tag: ['@functional'] },
    async ({ user }) => {
      const att = user.attendance;
      await att.open(user.magnet);
      await att.startMarking();
      await att.markExactlyAbsent(ABSENT);
      expect(await att.absentRolls(), 'grid').toEqual(ABSENT);
      await att.done();
      const s = await att.summary();
      expect(s.boys.p + s.girls.p, `present (${s.text})`).toBe(27);
      expect(s.boys.ab + s.girls.ab, 'absent').toBe(3);
      expect(s.total.t, 'total').toBe(30);
      const notice = await att.absentNotice();
      expect(notice, 'absent notice shown').not.toBeNull();
      expect(notice.count, notice.text).toBe(3);
      expect(notice.rolls, notice.text).toEqual(ABSENT);
    }
  );

  test(
    'ATT-07-02: after Submit, reopening the register shows exactly the same students absent',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const att = user.attendance;
      // Start from a different record, so the marks below are really submitted.
      await att.recordAttendance(user.magnet, []);
      expect(await att.recordAttendance(user.magnet, ABSENT), 'Submit sent the new marks').toBe(true);
      await att.open(user.magnet);
      await expect
        .poll(() => att.absentRolls(), { message: 'locked view after reopening', timeout: 20000 })
        .toEqual(ABSENT);
      await expect(att.editBtn.filter({ visible: true }).first()).toBeVisible();
      await att.editBtn.filter({ visible: true }).first().click({ force: true });
      await expect.poll(() => att.absentRolls(), { message: 'Edit Attendance grid' }).toEqual(ABSENT);
    }
  );

  test(
    'ATT-07-03: after a full app reload the submitted marks are still there',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const att = user.attendance;
      await att.recordAttendance(user.magnet, ABSENT);
      await page.reload();
      await user.toolbar.wbSvg.waitFor({ state: 'visible', timeout: 30000 });
      await att.open(user.magnet);
      await expect.poll(() => att.absentRolls(), { message: 'marks after reload', timeout: 20000 }).toEqual(ABSENT);
      const s = await att.summary();
      expect(s.boys.ab + s.girls.ab, `absent after reload (${s.text})`).toBe(3);
    }
  );

  test(
    'ATT-07-04: editing after submit (one student changed) keeps the change and records it once',
    { tag: ['@functional', '@regression'] },
    async ({ user, page }) => {
      const att = user.attendance;
      await att.recordAttendance(user.magnet, ABSENT);
      await att.open(user.magnet);
      await att.startMarking();
      await att.tap((await att.cells.allInnerTexts()).findIndex((t) => t.trim() === '7'));
      expect(await att.absentRolls(), 'roll 7 now present').toEqual([3, 15]);
      const sent = [];
      page.on('request', (r) => isSubmit(r) && sent.push(r.url()));
      await att.submit();
      await page.waitForTimeout(3000);
      expect(sent, 'one submit request').toHaveLength(1);
      await att.open(user.magnet);
      await expect.poll(() => att.absentRolls(), { message: 'edited marks kept', timeout: 20000 }).toEqual([3, 15]);
      const s = await att.summary();
      expect(s.boys.p + s.girls.p, `present (${s.text})`).toBe(28);
      expect(s.boys.ab + s.girls.ab, 'absent').toBe(2);
      expect(s.total.t, 'still 30 students, nothing duplicated').toBe(30);
      expect(await att.cells.count(), 'one cell per student').toBe(30);
    }
  );

  test(
    'ATT-07-05: Mark All Present then tapping students absent and back keeps the summary equal to the grid',
    { tag: ['@functional'] },
    async ({ user }) => {
      const att = user.attendance;
      await att.open(user.magnet);
      await att.startMarking();
      await att.markExactlyAbsent([]);
      const check = async (step) => {
        const grid = await att.gridCounts();
        const s = await att.summary();
        expect(s.boys.p + s.girls.p, `${step}: present (${s.text})`).toBe(grid.present);
        expect(s.boys.ab + s.girls.ab, `${step}: absent`).toBe(grid.absent);
      };
      await check('all present');
      expect((await att.gridCounts()).present).toBe(30);
      await att.tap(3);
      await att.tap(8);
      expect(await att.absentRolls()).toEqual([4, 9]);
      await check('two absent');
      await att.tap(3);
      expect(await att.absentRolls(), 'tapping again marks present').toEqual([9]);
      await check('one toggled back');
      await att.markAllPresent();
      await expect.poll(async () => (await att.gridCounts()).present, { message: 'Mark All Present' }).toBe(30);
      await check('Mark All Present again');
    }
  );

  test(
    'ATT-07-06: closing part-way through an edit (Close -> Confirm) does not change the submitted attendance',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const att = user.attendance;
      await att.recordAttendance(user.magnet, ABSENT);
      await att.open(user.magnet);
      await att.startMarking();
      await att.tap((await att.cells.allInnerTexts()).findIndex((t) => t.trim() === '20'));
      expect(await att.absentRolls(), 'set-up: roll 20 marked absent, not submitted').toEqual([3, 7, 15, 20]);
      // The dialog promises: "your progress will be saved. You can resume later for final submission."
      await att.closeAndConfirm();
      await att.open(user.magnet);
      await page.waitForTimeout(1500);
      const resumeOffered = await att.hasDraft();
      const rolls = resumeOffered ? null : await att.absentRolls();
      if (!resumeOffered && JSON.stringify(rolls) !== JSON.stringify(ABSENT))
        await page.screenshot({ path: 'evidence/issues/attendance-close-applies-unsubmitted-edit.png' });
      expect(
        resumeOffered || rolls,
        'either the unsubmitted edit is offered to resume, or the submitted marks are unchanged'
      ).toEqual(resumeOffered ? true : ABSENT);
    }
  );

  test(
    'ATT-07-07: resuming a draft keeps the absent marks made before closing (needs a day not yet submitted)',
    { tag: ['@regression'] },
    async ({ user }) => {
      const att = user.attendance;
      await att.open(user.magnet);
      const fresh = await att.markAttendanceBtn.isVisible().catch(() => false);
      test.skip(
        !fresh,
        "Today's Class 10A attendance is already submitted, so no draft can be made; runs on a day before the first submit."
      );
      await att.markAttendanceBtn.click({ force: true });
      await att.cells.first().waitFor({ state: 'visible', timeout: 20000 });
      await att.markExactlyAbsent([3, 7]);
      await att.closeAndConfirm();
      await att.open(user.magnet);
      await expect(att.resumeBtn, 'draft offered').toBeVisible();
      await att.resumeBtn.click();
      await att.cells.first().waitFor({ state: 'visible', timeout: 15000 });
      await att.pauseBtn.click({ force: true }).catch(() => {});
      expect(await att.absentRolls(), 'draft marks restored').toEqual([3, 7]);
      await att.resumePlayBtn.click({ force: true }).catch(() => {});
      await user.page.waitForTimeout(10000); // the roll call passes rolls 3 and 7
      await att.fastForwardBtn.click({ force: true });
      await user.page.waitForTimeout(2000);
      if (JSON.stringify(await att.absentRolls()) !== '[3,7]')
        await user.page.screenshot({ path: 'evidence/issues/attendance-resume-draft-marks-lost.png' });
      await expect.poll(() => att.absentRolls(), { message: 'roll call kept the absent marks' }).toEqual([3, 7]);
    }
  );

  test(
    'ATT-07-08: a student marked absent never shows as present after a reload',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const att = user.attendance;
      await att.recordAttendance(user.magnet, ABSENT);
      for (let round = 1; round <= 2; round++) {
        await page.reload();
        await user.toolbar.wbSvg.waitFor({ state: 'visible', timeout: 30000 });
        await att.open(user.magnet);
        await expect.poll(() => att.cells.count(), { message: 'the register loaded', timeout: 20000 }).toBe(30);
        const present = [];
        for (const roll of ABSENT)
          if (/\bpresent\b/.test((await att.cell(roll).getAttribute('class')) || '')) present.push(roll);
        expect(present, `reload ${round}: no absent student shown as present`).toEqual([]);
        expect(await att.absentRolls(), `reload ${round}: the absent students`).toEqual(ABSENT);
        await att.closeAll();
      }
    }
  );
});
