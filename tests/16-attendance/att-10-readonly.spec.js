// ATT-10 — Attendance for a teacher who is not the class teacher
// Source: CEPV2_Stories/16_Attendance.md
// Account VALID_PIN_2. Nothing is marked or submitted.

const { test, expect } = require('../../fixtures');

test.describe('ATT-10 Attendance for a teacher who is not the class teacher', () => {
  test.afterEach(async ({ app }) => {
    await app.attendance.closeAll();
  });

  test.describe('Class 9A Science', () => {
    test.use({ classMap: 'attendanceReadOnly' });

    test(
      'ATT-10-01: the register opens read-only (Mark All Present and Done disabled) and tapping changes nothing',
      { tag: ['@functional'] },
      async ({ user, page }) => {
        const att = user.attendance;
        await att.open(user.magnet);
        await att.startMarking().catch(() => {});
        await att.cells.first().waitFor({ state: 'visible', timeout: 20000 });
        expect(await att.isDisabled(att.markAllPresentBtn), 'Mark All Present disabled').toBe(true);
        expect(await att.isDisabled(att.doneBtn), 'Done disabled').toBe(true);
        const before = await att.gridCounts();
        await att.tap(0);
        expect(await att.gridCounts(), 'tapping changes nothing').toEqual(before);
        await page.screenshot({ path: 'test-results/att-10-01-readonly.png' });
      }
    );

    test(
      'ATT-10-02: the read-only register tells the teacher why marking is not available',
      { tag: ['@functional'] },
      async ({ user }) => {
        const att = user.attendance;
        await att.open(user.magnet);
        await att.startMarking().catch(() => {});
        await att.cells.first().waitFor({ state: 'visible', timeout: 20000 });
        await expect(
          att.container
            .getByText(/locked|class teacher|not allowed|cannot|only|view only|read.only|permission/i)
            .first(),
          'an explanation is shown'
        ).toBeVisible();
      }
    );
  });

  test.describe('Class 10A Science', () => {
    test.use({ classMap: 'attendanceNoStudents' });

    test(
      'ATT-10-03: choosing Attendance in a class this teacher cannot take opens a register or says why, never nothing',
      { tag: ['@functional'] },
      async ({ user, page }) => {
        const att = user.attendance;
        await user.magnet.open();
        const listed = await user.magnet.attendanceItem.isVisible().catch(() => false);
        test.skip(!listed, 'Magnet does not list Attendance here, which is the expected behaviour.');
        await user.magnet.attendanceItem.click({ force: true });
        const opened = await att.container
          .waitFor({ state: 'visible', timeout: 15000 })
          .then(() => true)
          .catch(() => false);
        const empty = opened && (await att.noStudentsText.isVisible().catch(() => false));
        if (!opened || empty)
          await page.screenshot({ path: 'evidence/issues/attendance-not-class-teacher-nothing-opens.png' });
        expect(opened, 'Attendance opens something (a register or a message)').toBe(true);
        expect(empty, 'not an empty "No students found" register').toBe(false);
      }
    );
  });
});
