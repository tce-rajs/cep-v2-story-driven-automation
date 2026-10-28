// FLOW-17-09 / FLOW-19-11 — AI Homework and Attendance work in EVERY class the teacher teaches.
// Source: CEPV2_Stories/00_EndToEndFlows.md. Phase 1 found Homework blocked in 5 of raj.shinde's 9 classes and
// Attendance not opening (HTTP 500) in 3; the module suites only used one class each, so they missed it.
// One test per class and feature. Read-only: the builder and the register are opened and closed, nothing is
// generated, marked or sent.

const { test, expect } = require('../../fixtures');

// raj.shinde's classes (Recent Classes, 9 Oct 2026).
const CLASSES = [
  ['Class 9', 'A', 'Science'],
  ['Class 10', 'A', 'Science'],
  ['Class 12', 'A', 'Computer Science'],
  ['Class 12', 'A', 'Physics'],
  ['Class 5', 'A', 'Mathematics'],
  ['Class 10', 'A', 'Mathematics'],
  ['Class 11', 'A', 'Mathematics'],
  ['Class 10', 'A', 'Sanskrit Literature'],
  ['Class 10', 'A', 'Political Science'],
];
const ATTENDANCE_CLASSES = CLASSES.filter(
  ([grade, division, subject]) => !(grade === 'Class 9' && division === 'A' && subject === 'Science')
);
const label = (g, d, s) => `${g.replace('Class ', '')} ${d} ${s}`;

test.describe('FLOW-17-09 AI Homework works in every class the teacher teaches', () => {
  for (const [g, d, s] of CLASSES) {
    test(`FLOW-17-09: Homework can be generated in ${label(g, d, s)}`, { tag: ['@functional'] }, async ({ user }) => {
      await user.nav.resetToClass(g, d, s);
      const hw = user.aiHomework;
      await hw.open(user.magnet);
      try {
        await user.page.waitForTimeout(2500);
        await expect(hw.wrongSubjectBanner, 'no "grade or class seems incorrect" message').toBeHidden();
        await expect(hw.generateBtn, 'Generate is available').toBeEnabled();
      } finally {
        await hw.closeAll();
      }
    });
  }
});

test.describe('FLOW-19-11 Attendance opens in every class whose Magnet lists it', () => {
  for (const [g, d, s] of ATTENDANCE_CLASSES) {
    test(
      `FLOW-19-11: the attendance register opens in ${label(g, d, s)}`,
      { tag: ['@functional'] },
      async ({ user }) => {
        await user.nav.resetToClass(g, d, s);
        await user.magnet.open();
        const listed = await user.magnet.attendanceItem.isVisible().catch(() => false);
        await user.page.keyboard.press('Escape');
        test.skip(!listed, `Attendance is not offered for ${label(g, d, s)}`);
        const a = user.attendance;
        await user.magnet.choose('attendance');
        try {
          await expect(a.container, 'the register opens').toBeVisible({ timeout: 20000 });
          await expect(a.noStudentsText, 'the register lists students').toBeHidden();
        } finally {
          await a.closeBtn
            .first()
            .click({ force: true, timeout: 3000 })
            .catch(() => {});
          if (await a.closeDialog.isVisible().catch(() => false)) await a.closeDialogCancelBtn.click({ force: true });
        }
      }
    );
  }
});
