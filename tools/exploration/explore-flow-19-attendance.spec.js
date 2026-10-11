// Phase 1 exploration — FLOW-19 Attendance, in the desktop client. Not part of any suite.
// Every class the teacher teaches: is Attendance offered, and what state does the register open in? Only opened and
// closed (no marking) except in 10 A Science, the class the automated suite already takes attendance in, where the
// roster is opened to read the counts. Nothing is submitted. Evidence: report/exploration/flow-19/.
const fs = require('fs');
const path = require('path');
const { test } = require('../../fixtures');

const OUT = path.join(__dirname, '..', '..', 'report', 'exploration', 'flow-19');
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const note = (step, data) => {
  log.push({ step, ...data });
  fs.writeFileSync(path.join(OUT, 'log.json'), JSON.stringify(log, null, 2));
};

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

test.use({ classMap: 'default' });
test.setTimeout(30 * 60 * 1000);

test('explore FLOW-19 Attendance', async ({ user, page }) => {
  const a = user.attendance;
  const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(() => {});
  const step = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      note(name, { error: e.message.split('\n')[0] });
      await shot(`${name}-error`);
      await page.keyboard.press('Escape').catch(() => {});
    }
  };
  const state = async () => {
    const vis = async (l) => l.isVisible().catch(() => false);
    return {
      play: await vis(a.playBtn),
      mark: await vis(a.markAttendanceBtn),
      edit: await vis(a.editBtn),
      submit: await vis(a.submitBtn),
      resume: await vis(a.resumeBtn),
      roster: await vis(a.markAllPresentBtn),
      noStudents: await vis(a.noStudentsText),
      text: (await a.container.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300),
    };
  };

  for (const [grade, division, subject] of CLASSES) {
    const key = `${grade} ${division} ${subject}`.replace(/\s+/g, '-');
    await step(`A-${key}`, async () => {
      await user.nav.resetToClass(grade, division, subject);
      await page.waitForTimeout(2000);
      await user.magnet.open();
      const item = (await user.magnet.attendanceItem.isVisible().catch(() => false))
        ? (await user.magnet.attendanceItem.innerText()).replace(/\s+/g, ' ')
        : null;
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      if (!item) return note(`A-${key}`, { magnetItem: null });
      await a.open(user.magnet);
      await page.waitForTimeout(1500);
      await shot(`A-${key}`);
      note(`A-${key}`, { magnetItem: item, register: await state() });
      // Close without marking anything (no draft is created by opening).
      await a.closeBtn
        .first()
        .click({ force: true, timeout: 3000 })
        .catch(() => {});
      await page.waitForTimeout(800);
      note(`A-${key}-closed`, {
        stillOpen: await a.isOpen(),
        closeDialog: await a.closeDialog.isVisible().catch(() => false),
      });
      if (await a.closeDialog.isVisible().catch(() => false)) await a.closeDialogCancelBtn.click({ force: true });
      if (await a.isOpen()) await page.keyboard.press('Escape');
    });
  }

  // 10 A Science: the roster and its counts, plus yesterday's register (read-only)
  await step('B-roster-10A', async () => {
    await user.nav.resetToClass('Class 10', 'A', 'Science');
    await page.waitForTimeout(2000);
    await a.open(user.magnet);
    const before = await state();
    if (before.edit || before.mark || before.resume) await a.startMarking();
    await page.waitForTimeout(1500);
    await shot('B-roster-10A');
    note('B-roster-10A', {
      before,
      summary: await a.summary().catch((e) => e.message),
      grid: await a.gridCounts().catch(() => null),
      firstCells: (await a.cells.allInnerTexts().catch(() => [])).slice(0, 10),
    });
  });

  await step('C-yesterday', async () => {
    if (!(await a.isOpen())) await a.open(user.magnet);
    await a.prevDayBtn.click({ force: true });
    await page.waitForTimeout(2500);
    await shot('C-yesterday');
    note('C-yesterday', { register: await state(), locked: await a.lockedNotice.isVisible().catch(() => false) });
  });

  // Leave without changing anything: Close, and cancel any "save progress" dialog (keeps today's state as it was).
  await a.closeBtn
    .first()
    .click({ force: true, timeout: 3000 })
    .catch(() => {});
  await page.waitForTimeout(800);
  note('D-close', { dialog: await a.closeDialog.isVisible().catch(() => false) });
  await shot('D-close');
  if (await a.closeDialog.isVisible().catch(() => false)) {
    await a.closeDialogConfirmBtn.click({ force: true });
  }
});
