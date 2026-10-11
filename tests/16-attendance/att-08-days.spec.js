// ATT-08 — Attendance across subjects and days
// Source: CEPV2_Stories/16_Attendance.md
// ATT-08-01 really submits today's attendance for Class 10A (Science), then only reads it from Mathematics.

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'attendance' });

test.describe('ATT-08 Attendance across subjects and days', () => {
  test.describe.configure({ timeout: 240000 });

  test.afterEach(async ({ app }) => {
    await app.attendance.closeAll();
  });

  test(
    "ATT-08-01: attendance is one register per class per day -- marks submitted in Science show in Mathematics' register",
    { tag: ['@functional'] },
    async ({ user }) => {
      const att = user.attendance;
      await att.recordAttendance(user.magnet, [3, 7, 15]);
      await user.nav.resetToClass('Class 10', 'A', 'Mathematics');
      await att.open(user.magnet);
      await expect(att.editBtn.filter({ visible: true }).first(), 'Mathematics shows the day as taken').toBeVisible();
      await expect
        .poll(() => att.absentRolls(), { message: 'same marks in Mathematics', timeout: 20000 })
        .toEqual([3, 7, 15]);
    }
  );

  test(
    "ATT-08-02: the previous-day arrow shows yesterday's attendance read-only",
    { tag: ['@functional'] },
    async ({ user }) => {
      const att = user.attendance;
      await att.open(user.magnet);
      const today = (await att.summaryTable.innerText()).split('\n')[0].trim();
      await att.prevDayBtn.click({ force: true });
      await expect(att.summaryTable, 'date moved back a day').not.toContainText(today, { timeout: 10000 });
      await expect(att.lockedNotice, 'locked notice').toBeVisible();
      const before = await att.gridCounts();
      await att.tap(0);
      expect(await att.gridCounts(), 'tapping a past day changes nothing').toEqual(before);
      for (const b of [att.editBtn, att.submitBtn, att.markAllPresentBtn, att.doneBtn]) {
        if (await b.filter({ visible: true }).count())
          expect(await att.isDisabled(b.filter({ visible: true })), 'past-day buttons disabled').toBe(true);
      }
    }
  );

  test(
    'ATT-08-03: on today the next-day arrow is disabled, and coming back from yesterday shows today again',
    { tag: ['@functional'] },
    async ({ user }) => {
      const att = user.attendance;
      await att.open(user.magnet);
      const today = (await att.summaryTable.innerText()).split('\n')[0].trim();
      const todayMarks = await att.absentRolls();
      expect(await att.isDisabled(att.nextDayBtn), 'no future attendance').toBe(true);
      await att.prevDayBtn.click({ force: true });
      await expect(att.summaryTable).not.toContainText(today, { timeout: 10000 });
      await att.nextDayBtn.click({ force: true });
      await expect(att.summaryTable, 'back on today').toContainText(today, { timeout: 10000 });
      expect(await att.absentRolls(), "today's marks shown again").toEqual(todayMarks);
    }
  );
});
