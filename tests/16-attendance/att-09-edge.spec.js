// ATT-09 — Edge cases and interruptions
// Source: CEPV2_Stories/16_Attendance.md
// Real submits on today's Class 10A attendance; each test that changes the record puts rolls 3, 7, 15 absent back.

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'attendance' });

const BASE = [3, 7, 15];
const indexOfRoll = async (att, roll) => (await att.cells.allInnerTexts()).findIndex((t) => t.trim() === String(roll));

test.describe('ATT-09 Edge cases and interruptions', () => {
  test.describe.configure({ timeout: 300000 });

  test.afterEach(async ({ app }) => {
    await app.attendance.closeAll();
  });

  test(
    'ATT-09-01: every student absent can be submitted, and reopens as 0 present / 30 absent',
    { tag: ['@edge'] },
    async ({ user }) => {
      const att = user.attendance;
      const all = Array.from({ length: 30 }, (_, i) => i + 1);
      await att.recordAttendance(user.magnet, all);
      await att.open(user.magnet);
      await expect.poll(async () => (await att.absentRolls()).length, { timeout: 20000 }).toBe(30);
      const s = await att.summary();
      expect(s.boys.p + s.girls.p, `nobody present (${s.text})`).toBe(0);
      expect(s.boys.ab + s.girls.ab, 'everyone absent').toBe(30);
      expect((await att.absentNotice())?.count, 'absent notice').toBe(30);
      await att.closeAll();
      await att.recordAttendance(user.magnet, BASE);
    }
  );

  test(
    'ATT-09-02: rapid taps on one roll number end in a consistent state that the summary agrees with',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      const att = user.attendance;
      await att.open(user.magnet);
      await att.startMarking();
      await att.markExactlyAbsent(BASE);
      const i = await indexOfRoll(att, 10);
      for (let k = 0; k < 10; k++) await att.cells.nth(i).click({ force: true, delay: 0 });
      await page.waitForTimeout(1500);
      expect(await att.cellState(i), 'an even number of taps leaves the student as they were').toBe('present');
      for (let k = 0; k < 5; k++) await att.cells.nth(i).click({ force: true, delay: 0 });
      await page.waitForTimeout(1500);
      expect(await att.cellState(i), 'an odd number of taps flips the student').toBe('absent');
      const grid = await att.gridCounts();
      const s = await att.summary();
      expect(s.boys.ab + s.girls.ab, `summary matches the grid (${s.text})`).toBe(grid.absent);
      expect(s.boys.p + s.girls.p, 'present').toBe(grid.present);
    }
  );

  test(
    'ATT-09-03: switching class part-way through an edit leaves the submitted attendance unchanged',
    { tag: ['@edge'] },
    async ({ user }) => {
      const att = user.attendance;
      await att.recordAttendance(user.magnet, BASE);
      await att.open(user.magnet);
      await att.startMarking();
      await att.tap(await indexOfRoll(att, 20));
      await user.nav.applyClassMap('navigationGeneral');
      await expect(user.whiteboard.currentClassBtn).toContainText('Class 5');
      if (await att.isOpen()) {
        // The register can stay open over the new class; leave it with Close -> Cancel-free path is not offered.
        await att.closeAll();
      }
      await user.nav.applyClassMap('attendance');
      await att.open(user.magnet);
      if (!(await att.hasDraft()))
        await expect.poll(() => att.absentRolls(), { message: 'submitted marks unchanged' }).toEqual(BASE);
    }
  );

  test(
    'ATT-09-04: signing out part-way through an edit and back in leaves the submitted attendance unchanged',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      const att = user.attendance;
      await att.recordAttendance(user.magnet, BASE);
      await att.open(user.magnet);
      await att.startMarking();
      await att.tap(await indexOfRoll(att, 20));
      await user.userMenu.signOut();
      await expect(att.container.filter({ visible: true }), 'register gone after sign-out').toHaveCount(0);
      await user.signIn(process.env.VALID_PIN);
      await user.nav.applyClassMap('attendance');
      await att.open(user.magnet);
      await page.waitForTimeout(1500);
      if (!(await att.hasDraft()))
        await expect.poll(() => att.absentRolls(), { message: 'submitted marks unchanged' }).toEqual(BASE);
    }
  );

  test(
    'ATT-09-05: no "undefined", "null", NaN or raw text keys anywhere in the register',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const att = user.attendance;
      const texts = [];
      const grab = async (where) =>
        texts.push([where, (await att.container.innerText().catch(() => '')).replace(/\s+/g, ' ')]);
      await att.open(user.magnet);
      await grab('entry');
      await att.startMarking();
      await grab('marking grid');
      await att.tap(await indexOfRoll(att, 20));
      await att.done();
      await grab('review after Done');
      await att.closeBtn.first().click({ force: true });
      await att.closeDialog.waitFor({ state: 'visible', timeout: 5000 });
      texts.push([
        'close dialog',
        (await page.locator('[data-qa-id="attendance-close-dialog-confirm-btn"]').locator('xpath=../..').innerText())
          .replace(/\s+/g, ' ')
          .trim(),
      ]);
      await att.closeDialogCancelBtn.click({ force: true });
      await att.prevDayBtn.click({ force: true });
      await page.waitForTimeout(1500);
      await grab('previous day');
      for (const [where, text] of texts) {
        expect(text, `${where}: no placeholder or debug text`).not.toMatch(
          /\bundefined\b|\bnull\b|\bNaN\b|\{\{|\}\}|\b[a-z]+(?:[._][a-z]+){2,}\b|\[object/
        );
      }
    }
  );

  test(
    'ATT-09-06: the absent notice reads correctly for a single student ("1 student", not "1 students")',
    { tag: ['@functional'] },
    async ({ user }) => {
      const att = user.attendance;
      await att.open(user.magnet);
      await att.startMarking();
      await att.markExactlyAbsent([3]);
      await att.done();
      const notice = await att.absentNotice();
      expect(notice?.count, 'one absent').toBe(1);
      if (/1 students/.test(notice.text))
        await user.page.screenshot({ path: 'evidence/issues/attendance-1-students-wording.png' });
      expect(notice.text, 'singular wording').toMatch(/^1 student,/);
    }
  );

  test(
    'ATT-09-07: the register shows no build/version stamp to the teacher',
    { tag: ['@functional'] },
    async ({ user }) => {
      const att = user.attendance;
      await att.open(user.magnet);
      const stamp = att.container.getByText(/v\d+\.\d+\.\d+\s*\/\s*\d+/);
      if (await stamp.isVisible().catch(() => false))
        await user.page.screenshot({ path: 'evidence/issues/attendance-build-stamp.png' });
      await expect(stamp, 'no build stamp in the panel').toBeHidden();
    }
  );

  test(
    'ATT-09-08: marking every student absent is allowed and shows 0 present',
    { tag: ['@negative'] },
    async ({ user }) => {
      const att = user.attendance;
      await att.open(user.magnet);
      await att.startMarking();
      const total = await att.cells.count();
      await att.markExactlyAbsent(Array.from({ length: total }, (_, i) => i + 1));
      await expect.poll(async () => (await att.gridCounts()).absent, { message: 'everyone absent' }).toBe(total);
      await att.done();
      const s = await att.summary();
      expect(s.boys.p + s.girls.p, `0 present (${s.text})`).toBe(0);
      expect(s.boys.ab + s.girls.ab, 'everyone absent').toBe(total);
      await expect(att.submitBtn.filter({ visible: true }).first(), 'and it can be submitted').toBeEnabled();
      // Nothing submitted here: put today's usual record (3, 7, 15 absent) back in case closing kept the draft.
      await att.closeAll();
      await att.recordAttendance(user.magnet, BASE);
    }
  );
});
