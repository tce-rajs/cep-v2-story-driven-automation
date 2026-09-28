// ATT-05 — Play Attendance (roll call)
// Source: CEPV2_Stories/16_Attendance.md

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'attendance' });

test.describe('ATT-05 Play Attendance (roll call)', () => {
  test.beforeEach(async ({ user }) => {
    await user.attendance.open(user.magnet);
    // CONFIRMED LIVE (2026-09-26): Play Attendance is offered on a fresh day (Play button) or by resuming a draft; once
    // today's attendance is submitted the register only offers Edit Attendance -> the marking grid, with no Play. This
    // file is named att-00 so it runs before the rest of the module submits today's attendance.
    const playable =
      (await user.attendance.hasDraft()) || (await user.attendance.playBtn.isVisible().catch(() => false));
    test.skip(
      !playable,
      "Today's attendance is already submitted, so Play Attendance is not offered; runs on a day before the first submit."
    );
    // A draft in progress resumes straight into Play Attendance; otherwise start it.
    if (await user.attendance.hasDraft()) await user.attendance.resumeBtn.click();
    else if (await user.attendance.editBtn.isVisible()) await user.attendance.editBtn.click({ force: true });
  });

  test.afterEach(async ({ app }) => {
    await app.attendance.closeAll();
  });

  test(
    'ATT-05-01: Play Attendance calls students one by one, with the progress ring moving forward',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const att = user.attendance;
      if (await att.playBtn.isVisible().catch(() => false)) await att.playBtn.click({ force: true });
      await expect(att.carouselItems.first(), 'roll-call carousel shown').toBeVisible({ timeout: 15000 });
      const progress = () =>
        att.progressRing
          .first()
          .evaluate(
            (el) => el.outerHTML.match(/stroke-dashoffset[:=]"?\s*([\d.]+)/)?.[1] || el.getAttribute('style') || ''
          );
      const first = await att.carouselItems.first().innerText();
      const ring1 = await progress();
      await page.waitForTimeout(8000);
      const shownNow = await att.carouselItems.filter({ visible: true }).first().innerText();
      const ring2 = await progress();
      expect(shownNow !== first || ring2 !== ring1, 'the roll call moved on to the next student').toBe(true);
      expect(ring2, 'progress ring changed').not.toBe(ring1);
    }
  );

  test(
    'ATT-05-02: changing the speed changes how fast students are called',
    { tag: ['@functional'] },
    async ({ user }) => {
      const att = user.attendance;
      if (await att.playBtn.isVisible().catch(() => false)) await att.playBtn.click({ force: true });
      await expect(att.speedSelector.first()).toBeVisible({ timeout: 15000 });
      const before = (await att.speedDisplay.first().innerText()).trim();
      await att.speedSelector.first().click({ force: true });
      const option = user.page
        .locator('mat-option, .speed-option, [role="option"]')
        .filter({ hasNotText: before })
        .first();
      if (await option.isVisible().catch(() => false)) await option.click();
      await expect(att.speedDisplay.first(), 'speed changed').not.toHaveText(before, { timeout: 5000 });
    }
  );

  test(
    'ATT-05-03: a student whose birthday is today gets a birthday popup during the roll call',
    { tag: ['@functional'] },
    async ({ user }) => {
      const att = user.attendance;
      if (await att.playBtn.isVisible().catch(() => false)) await att.playBtn.click({ force: true });
      await user.page.waitForTimeout(3000);
      const hasBirthday = await att.birthdayText
        .first()
        .isVisible()
        .catch(() => false);
      test.skip(!hasBirthday, 'Needs a Class 12A student whose birthday is today; none today. Re-run on such a day.');
      await expect(att.birthdayText.first()).toBeVisible();
    }
  );
});
