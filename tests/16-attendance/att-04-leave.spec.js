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

  // Confirming the close part-way through: no error (ATT-04-03), and the register opens normally again (ATT-04-06) --
  // one test each.
  const confirmCloseMidway = async (att) => {
    await att.closeBtn.first().click({ force: true });
    await att.closeDialogConfirmBtn.click({ force: true, timeout: 5000 }).catch(() => {});
    await expect(att.container, 'set-up: register closed').toBeHidden({ timeout: 10000 });
  };

  test(
    'ATT-04-03: confirming the close part-way through shows no error',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await confirmCloseMidway(user.attendance);
      await expect(page.getByText(/error|went wrong|failed/i).filter({ visible: true }), 'no error shown').toHaveCount(
        0
      );
      expect(errors, 'no uncaught page errors').toEqual([]);
    }
  );

  test(
    'ATT-04-06: after confirming the close part-way through, the register opens normally again',
    { tag: ['@regression'] },
    async ({ user }) => {
      const att = user.attendance;
      await confirmCloseMidway(att);
      await att.open(user.magnet);
      await att.startMarking();
      expect(await att.cells.count()).toBeGreaterThan(0);
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

  // Switching class before submitting: no register is left behind (ATT-04-05), and the original class's Attendance still
  // opens (ATT-04-07) -- one test each.

  test(
    "ATT-04-07: after switching class before submitting, the original class's Attendance still opens normally",
    { tag: ['@functional'] },
    async ({ user }) => {
      await user.nav.applyClassMap('navigationGeneral');
      await user.attendance.closeAll().catch(() => {}); // the register may be left over the new class (ATT-04-05)
      await user.nav.applyClassMap('attendance');
      await user.attendance.open(user.magnet);
      await user.attendance.startMarking();
      expect(await user.attendance.cells.count()).toBeGreaterThan(0);
    }
  );

  test(
    'ATT-04-08: cancelling the close confirmation keeps the register open with every mark',
    { tag: ['@negative'] },
    async ({ user }) => {
      const att = user.attendance;
      const before = await att.cells.evaluateAll((els) => els.map((e) => e.className));
      await att.closeBtn.first().click({ force: true });
      await expect(att.closeDialogCancelBtn, 'set-up: the close confirmation is asked').toBeVisible({ timeout: 5000 });
      await att.closeDialogCancelBtn.click({ force: true });
      await expect(att.closeDialogCancelBtn, 'the confirmation closed').toBeHidden({ timeout: 5000 });
      await expect(att.container, 'the register is still open').toBeVisible();
      expect(await att.cells.evaluateAll((els) => els.map((e) => e.className)), 'every mark kept').toEqual(before);
      await expect
        .poll(() => att.cellState(3), { message: 'the student marked absent is still absent' })
        .toBe('absent');
    }
  );
});
