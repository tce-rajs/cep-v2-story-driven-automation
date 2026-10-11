// Phase 1 exploration — FLOW-19 Attendance, second pass (read-only):
// (1) 12 A Physics: Magnet lists Attendance — does the register open?  (2) 10 A Science: the last 6 days' registers —
// do submitted days show who was present? Nothing is marked or submitted. Evidence: report/exploration/flow-19/.
const fs = require('fs');
const path = require('path');
const { test } = require('../../fixtures');

const OUT = path.join(__dirname, '..', '..', 'report', 'exploration', 'flow-19');
const LOG = path.join(OUT, 'log-b.json');
const log = [];
const note = (step, data) => {
  log.push({ step, ...data });
  fs.writeFileSync(LOG, JSON.stringify(log, null, 2));
};

test.use({ classMap: 'default' });
test.setTimeout(20 * 60 * 1000);

test('explore FLOW-19 Attendance, second pass', async ({ user, page }) => {
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

  await step('E-12A-physics', async () => {
    await user.nav.resetToClass('Class 12', 'A', 'Physics');
    await page.waitForTimeout(3000);
    await user.magnet.open();
    await page.waitForTimeout(1500);
    await shot('E-12A-magnet-menu');
    const items = await page.evaluate(() =>
      [...document.querySelectorAll('[data-qa-id^="toolbar-magnet-"]')]
        .filter((e) => e.getBoundingClientRect().width > 0)
        .map((e) => e.innerText.replace(/\s+/g, ' ').trim())
    );
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const failed = [];
    page.on('response', (r) => {
      if (r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(0, 120)}`);
    });
    await user.magnet.attendanceItem.click({ force: true });
    await page.waitForTimeout(12000);
    await shot('E-12A-after-click');
    note('E-12A-physics', {
      magnetItems: items,
      registerOpened: await a.isOpen(),
      anyMessage: await a.snackbar?.allInnerTexts?.().catch(() => []),
      pageErrors: errors.slice(0, 5),
      failedRequests: failed.slice(0, 10),
    });
    await page.keyboard.press('Escape');
  });

  await step('F-10A-history', async () => {
    await user.nav.resetToClass('Class 10', 'A', 'Science');
    await page.waitForTimeout(2000);
    await a.open(user.magnet);
    for (let d = 1; d <= 6; d++) {
      await a.prevDayBtn.click({ force: true });
      await page.waitForTimeout(2500);
      const text = (await a.container.innerText().catch(() => '')).replace(/\s+/g, ' ');
      const grid = await a.gridCounts().catch(() => null);
      await shot(`F-10A-day-minus-${d}`);
      note(`F-10A-day-minus-${d}`, {
        date: (text.match(/\w{3}, \d+ \w{3} \d{4}/) || [''])[0],
        summary: (text.match(/P Ab T .*?Total \d+/) || [''])[0],
        locked: /already submitted and locked/i.test(text),
        noRecord: /no attendance|not taken|holiday/i.test(text) ? text.slice(0, 200) : null,
        grid,
      });
    }
  });

  await a.closeBtn
    .first()
    .click({ force: true, timeout: 3000 })
    .catch(() => {});
  if (await a.closeDialog.isVisible().catch(() => false)) await a.closeDialogCancelBtn.click({ force: true });
});
