// ATT-03 — Submit and edit attendance
// Source: CEPV2_Stories/16_Attendance.md
// Real submits (owner-approved 2026-09-26): each writes today's attendance for Class 12A Physics.

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'attendance' });

test.describe('ATT-03 Submit and edit attendance', () => {
  test.beforeEach(async ({ user }) => {
    await user.attendance.open(user.magnet);
    await user.attendance.startMarking();
  });

  test.afterEach(async ({ app }) => {
    await app.attendance.closeAll();
  });

  test(
    'ATT-03-01: Submit saves the attendance, and reopening shows the same marks',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const att = user.attendance;
      await att.markAllPresent();
      for (const i of [0, 2]) await att.tap(i);
      const expected = [await att.cellState(0), await att.cellState(1), await att.cellState(2)];
      await att.submit();
      await att.closeAll();

      await att.open(user.magnet);
      await att.startMarking();
      // Right after a submit the reopened register can show everyone unmarked for a moment before the saved marks load.
      await expect
        .poll(async () => [await att.cellState(0), await att.cellState(1), await att.cellState(2)], {
          message: 'same marks after reopening',
          timeout: 20000,
        })
        .toEqual(expected);
      expect(expected).toEqual(['absent', 'present', 'absent']);
    }
  );

  test(
    'ATT-03-02: after submitting, Edit Attendance reopens the register with the previous marks',
    { tag: ['@functional'] },
    async ({ user }) => {
      const att = user.attendance;
      await att.markAllPresent();
      await att.tap(5);
      const before = await att.gridCounts();
      await att.submit();
      // Submit closes the panel; reopening offers Edit Attendance.
      await att.open(user.magnet);
      await expect(
        att.editBtn.filter({ visible: true }).first(),
        'Edit Attendance offered once submitted'
      ).toBeVisible();
      await att.editBtn.filter({ visible: true }).first().click({ force: true });
      await att.cells.first().waitFor({ state: 'visible', timeout: 15000 });
      expect(await att.cellState(5)).toBe('absent');
      expect(await att.gridCounts(), 'marks re-filled, not blank').toEqual(before);
    }
  );

  test(
    'ATT-03-03: double-clicking Submit records the attendance only once (regression)',
    { tag: ['@bug', '@regression'] },
    async ({ user, page }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232): a double-click on Submit Attendance sends TWO
      // POST .../tce-repo-api/1/res/v1/content/file submissions.
      test.fail(true, 'Double-clicking Submit Attendance sends the attendance twice');
      const att = user.attendance;
      // The submit is one POST .../tce-repo-api/1/res/v1/content/file (confirmed live 2026-09-26).
      const submits = [];
      page.on('request', (r) => {
        if (r.method() === 'POST' && /content\/file/i.test(r.url())) submits.push(r.url());
      });
      await att.markAllPresent();
      if (await att.doneBtn.isVisible().catch(() => false)) await att.doneBtn.click({ force: true });
      const submit = att.submitBtn.filter({ visible: true }).first();
      await submit.waitFor({ state: 'visible', timeout: 15000 });
      submits.length = 0;
      await submit.dblclick({ force: true });
      await att.container.waitFor({ state: 'hidden', timeout: 20000 });
      await page.waitForTimeout(3000);
      expect(submits, `one submit request (saw: ${submits.join(', ')})`).toHaveLength(1);
    }
  );

  test(
    'ATT-03-04: after submitting, the Magnet badge no longer shows "Pending" (regression, Zoho TCN-I15965/TCN-I15969)',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const att = user.attendance;
      await att.markAllPresent();
      await att.submit();
      await att.closeAll();
      await user.magnet.open();
      await expect(user.magnet.attendanceItem).not.toContainText(/pending/i, { timeout: 10000 });
      await page.keyboard.press('Escape');
    }
  );
});
