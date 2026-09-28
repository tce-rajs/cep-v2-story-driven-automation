// ATT-01 — Open the attendance register
// Source: CEPV2_Stories/16_Attendance.md
// Data: 'attendance' = the primary account's Class 12A Physics, where Magnet lists Attendance.

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'attendance' });

test.describe('ATT-01 Open the attendance register', () => {
  test.afterEach(async ({ app }) => {
    await app.attendance.closeAll();
  });

  test(
    "ATT-01-01: the Magnet menu shows Attendance with today's status badge",
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await user.magnet.open();
      await expect(user.magnet.attendanceItem).toBeVisible();
      const badge = (await user.magnet.attendanceItem.innerText())
        .replace(/\s+/g, ' ')
        .replace(/attendance/i, '')
        .trim();
      // CONFIRMED LIVE (2026-09-26): once submitted the badge is empty; before that it reads "Pending" (checked below).
      await user.page.keyboard.press('Escape');

      // The badge must agree with the register: "Pending" exactly when today's attendance hasn't been submitted.
      await user.attendance.open(user.magnet);
      const submitted = (await user.attendance.editBtn.isVisible()) && !(await user.attendance.hasDraft());
      if (submitted) expect(badge, 'already submitted today, so not Pending').not.toMatch(/pending/i);
      else expect(badge, 'not taken yet today, so Pending').toMatch(/pending/i);
    }
  );

  test(
    'ATT-01-02: opening Attendance shows the class roster, not an endless loading spinner (regression)',
    { tag: ['@regression', '@smoke'] },
    async ({ user }) => {
      await user.attendance.open(user.magnet);
      await expect(
        user.attendance.markAttendanceBtn.or(user.attendance.editBtn).or(user.attendance.resumeBtn).first()
      ).toBeVisible();
      await user.attendance.startMarking();
      expect(await user.attendance.cells.count(), 'roster shown').toBeGreaterThan(0);
      await expect(user.attendance.spinner.filter({ visible: true })).toHaveCount(0);
    }
  );

  test(
    'ATT-01-03: opening Attendance twice in quick succession opens only one register',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      await user.magnet.open();
      await user.magnet.attendanceItem.click({ force: true });
      await user.magnet.tool.click({ force: true }).catch(() => {});
      await user.magnet.attendanceItem.click({ force: true, timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(5000);
      await expect(user.attendance.container.filter({ visible: true }), 'one register').toHaveCount(1);
      await expect(
        user.attendance.markAttendanceBtn.or(user.attendance.editBtn).or(user.attendance.resumeBtn).first()
      ).toBeVisible({
        timeout: 30000,
      });
    }
  );

  test(
    'ATT-01-04: switching class while Attendance is still loading leaves no register over the new class (regression)',
    { tag: ['@bug', '@regression'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232; the reference suite's ATT-BREAK-02): switching class while
      // Attendance is opening leaves the register on screen over the new class.
      test.fail(true, 'The Attendance register stays on screen over the new class after a class switch');
      await user.magnet.choose('attendance');
      await user.nav.applyClassMap('navigationGeneral');
      await expect(user.whiteboard.currentClassBtn).toContainText('Class 5');
      await expect(user.attendance.container, 'no register left behind').toBeHidden({ timeout: 10000 });
    }
  );
});
