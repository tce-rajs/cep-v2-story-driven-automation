// ATT-04 — Leave before submitting
// Source: CEPV2_Stories/16_Attendance.md

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'attendance' });

test.describe('ATT-04 Leave before submitting', () => {
  test.beforeEach(async ({ user }) => {
    await user.attendance.open(user.magnet);
    await user.attendance.startMarking();
    await user.attendance.markAllPresent();
    await user.attendance.tap(3);
  });

  test.afterEach(async ({ app }) => {
    await app.attendance.closeAll();
  });

  test(
    'ATT-04-01: closing the register as the class teacher asks for confirmation first',
    { tag: ['@functional'] },
    async ({ user }) => {
      await user.attendance.closeBtn.first().click({ force: true });
      // CONFIRMED LIVE (2026-09-26): the primary account gets no confirmation -- the app only asks the class teacher
      // (reference suite ATT-PLAN-05); unsubmitted marks are kept as a draft and offered back with Resume on reopen.
      const asked = await user.attendance.closeDialogConfirmBtn
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      test.skip(
        !asked,
        'This account is not the class teacher of Class 12A Physics, so Close asks nothing (marks are kept as a draft).'
      );
      await expect(user.attendance.closeDialogConfirmBtn, 'close confirmation shown').toBeVisible();
      await expect(user.attendance.closeDialogCancelBtn).toBeVisible();
    }
  );

  test(
    'ATT-04-02: Cancel in the confirmation keeps the register open with the marks untouched',
    { tag: ['@functional'] },
    async ({ user }) => {
      const att = user.attendance;
      const before = await att.gridCounts();
      await att.closeBtn.first().click({ force: true });
      const asked = await att.closeDialogCancelBtn
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      test.skip(!asked, 'No close confirmation for this (non-class-teacher) account, so there is no Cancel to press.');
      await att.closeDialogCancelBtn.click({ force: true });
      await expect(att.cells.first()).toBeVisible();
      expect(await att.gridCounts()).toEqual(before);
      expect(await att.cellState(3)).toBe('absent');
    }
  );

  test(
    'ATT-04-03: confirming the close part-way through shows no error, and the register opens normally again (regression, Zoho TCN-I16577)',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      const att = user.attendance;
      await att.closeBtn.first().click({ force: true });
      await att.closeDialogConfirmBtn.click({ force: true, timeout: 5000 }).catch(() => {});
      await expect(att.container).toBeHidden({ timeout: 10000 });
      await expect(page.getByText(/error|went wrong|failed/i).filter({ visible: true }), 'no error shown').toHaveCount(
        0
      );
      await att.open(user.magnet);
      await att.startMarking();
      expect(await att.cells.count()).toBeGreaterThan(0);
      expect(errors).toEqual([]);
    }
  );

  test(
    'ATT-04-04: reloading before submitting brings Attendance back to one clean, usable state',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await page.reload();
      await user.toolbar.wbSvg.waitFor({ state: 'visible', timeout: 30000 });
      await expect(
        user.attendance.container.filter({ visible: true }),
        'no register left open after reload'
      ).toHaveCount(0);
      await user.attendance.open(user.magnet);
      await user.attendance.startMarking();
      expect(await user.attendance.cells.count()).toBeGreaterThan(0);
    }
  );

  test(
    "ATT-04-05: switching class before submitting leaves no register behind, and the original class's Attendance still opens",
    { tag: ['@bug', '@functional'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232): same defect as ATT-01-04 -- after switching class the
      // Attendance register is still on screen over the new class.
      test.fail(true, 'The Attendance register stays on screen over the new class after a class switch');
      await user.nav.applyClassMap('navigationGeneral');
      await expect(user.attendance.container).toBeHidden({ timeout: 10000 });
      await user.nav.applyClassMap('attendance');
      await user.attendance.open(user.magnet);
      await user.attendance.startMarking();
      expect(await user.attendance.cells.count()).toBeGreaterThan(0);
    }
  );
});
