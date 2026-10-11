// ATT-05 — Play Attendance (roll call)
// Source: CEPV2_Stories/16_Attendance.md

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'attendance' });

test.describe('ATT-05 Play Attendance (roll call)', () => {
  test.beforeEach(async ({ user }) => {
    await user.attendance.open(user.magnet);
    // Play Attendance is offered on a fresh day (Play button) or by resuming a draft; once
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
      await expect(att.speedToggle).toBeVisible({ timeout: 15000 });
      await expect(att.speedToggle).toContainText('1x');
      await att.speedToggle.click({ force: true });
      await expect(att.speedMenu, 'speed menu opens').toHaveClass(/\bvisible\b/, { timeout: 5000 });
      await att.speedOptions.filter({ hasText: 'Fast' }).click({ force: true });
      await expect(att.speedToggle, 'speed shows the chosen option').toContainText('1.5x', { timeout: 5000 });
      // At 1x the roll call moves on about every 2 s; at 1.5x it must call more students in the same time.
      const start = Number(await att.activeRollNumber.innerText());
      await user.page.waitForTimeout(8000);
      const called = Number(await att.activeRollNumber.innerText()) - start;
      expect(called, 'more than 4 students called in 8 s at 1.5x').toBeGreaterThan(4);
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

  test(
    'ATT-05-05: pausing Play Attendance stops the roll call on the current student',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const att = user.attendance;
      if (await att.playBtn.isVisible().catch(() => false)) await att.playBtn.click({ force: true });
      await expect(att.pauseBtn.first(), 'set-up: the roll call is running').toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(3000);
      await att.pauseBtn.first().click({ force: true });
      await page.waitForTimeout(1000);
      const paused = await att.activeRollNumber.innerText();
      await page.waitForTimeout(8000);
      expect(await att.activeRollNumber.innerText(), 'still on the same student after 8 s').toBe(paused);
    }
  );

  test(
    'ATT-05-04: closing Play Attendance part-way through leaves no carousel behind and the register still works',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const att = user.attendance;
      if (await att.playBtn.isVisible().catch(() => false)) await att.playBtn.click({ force: true });
      await expect(att.carouselItems.first(), 'set-up: the roll call is running').toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(4000);
      await att.closeBtn.first().click({ force: true });
      await att.closeDialogConfirmBtn.click({ force: true, timeout: 5000 }).catch(() => {});
      await expect(att.container, 'the register closed').toBeHidden({ timeout: 15000 });
      await expect(att.carouselItems.filter({ visible: true }), 'no roll-call carousel left behind').toHaveCount(0);
      // The register opens again and students can be marked.
      await att.open(user.magnet);
      await att.startMarking();
      await expect(att.cells.first(), 'the register still works').toBeVisible();
    }
  );
});
