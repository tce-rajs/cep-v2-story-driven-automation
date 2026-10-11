// ATT-03 — Submit and edit attendance
// Source: CEPV2_Stories/16_Attendance.md
// Real submits: each writes today's attendance for Class 12A Physics.

const { chromium } = require('@playwright/test');
const { test, expect } = require('../../fixtures');
const { BASE_URL } = require('../../config/env');
const { App } = require('../../pages/app');
const { pinForModule } = require('../../config/moduleClassMap');

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
    'ATT-03-04: after submitting, the Magnet badge no longer shows "Pending"',
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

  test(
    'ATT-03-07: Submit is not possible before the register is reviewed',
    { tag: ['@negative'] },
    async ({ user }) => {
      const att = user.attendance;
      await att.markAllPresent();
      // Still marking: Done (the review) has not been pressed.
      await expect(att.doneBtn.first(), 'set-up: on the marking screen').toBeVisible();
      const submit = att.submitBtn.filter({ visible: true });
      if ((await submit.count()) > 0)
        expect(await att.isDisabled(submit), 'Submit cannot be pressed before the review').toBe(true);
      else await expect(submit, 'no Submit before the review').toHaveCount(0);
    }
  );

  test(
    'ATT-03-05: two teachers submitting attendance for the same class at the same time end with one record, and the second is told',
    { tag: ['@concurrency'] },
    async ({ user }) => {
      test.setTimeout(240000);
      // Only the class teacher can submit this register, so the "second teacher" is the same class teacher on a
      // laptop (a separate browser session): two submissions for one class and day, at the same moment.
      const browser = await chromium.launch();
      try {
        const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1920, height: 1080 } });
        const laptop = new App(await context.newPage());
        await laptop.signIn(pinForModule('attendance'));
        await laptop.nav.applyClassMap('attendance');
        await laptop.attendance.open(laptop.magnet);
        await laptop.attendance.startMarking();
        await laptop.attendance.markExactlyAbsent([1]);
        await user.attendance.markExactlyAbsent([2]);
        await Promise.all([laptop.attendance.done(), user.attendance.done()]);
        const press = (app) => app.attendance.submitBtn.filter({ visible: true }).first().click({ force: true });
        await Promise.all([press(laptop), press(user)]);
        const told =
          /already (been )?submitted|someone else|another (device|teacher|session)|updated by|conflict|refresh/i;
        const message = (app) =>
          app.page
            .getByText(told)
            .filter({ visible: true })
            .first()
            .waitFor({ state: 'visible', timeout: 10000 })
            .then(() => true)
            .catch(() => false);
        const [laptopTold, panelTold] = await Promise.all([message(laptop), message(user)]);
        // One record: reopened anywhere, the register holds one teacher's marks, not a mix of both.
        await user.attendance.closeAll();
        await user.attendance.open(user.magnet);
        await user.attendance.startMarking();
        const absent = await user.attendance.absentRolls();
        test.info().annotations.push({
          type: 'note',
          description: `Saved absent: ${JSON.stringify(absent)}; told on laptop ${laptopTold}, on panel ${panelTold}.`,
        });
        expect([[1], [2]], 'one record: one submission’s marks, not merged').toContainEqual(absent);
        expect(laptopTold || panelTold, 'the second to submit is told').toBe(true);
      } finally {
        await browser.close();
      }
    }
  );

  test(
    'ATT-03-06: attendance submitted on the panel shows as submitted when the register is opened on a laptop',
    { tag: ['@concurrency'] },
    async ({ user }) => {
      test.setTimeout(240000);
      const att = user.attendance;
      await att.markExactlyAbsent([3, 7, 15]);
      await att.submit();
      // The laptop: a separate browser session signed in to the same account (the client cannot open a second tab).
      const browser = await chromium.launch();
      try {
        const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1920, height: 1080 } });
        const laptop = new App(await context.newPage());
        await laptop.signIn(pinForModule('attendance'));
        await laptop.nav.applyClassMap('attendance');
        await laptop.attendance.open(laptop.magnet);
        await expect(laptop.attendance.editBtn, 'the laptop shows it as submitted (Edit Attendance)').toBeVisible({
          timeout: 20000,
        });
        await expect
          .poll(() => laptop.attendance.absentRolls(), { message: 'with the same marks', timeout: 20000 })
          .toEqual([3, 7, 15]);
      } finally {
        await browser.close();
      }
    }
  );
});
