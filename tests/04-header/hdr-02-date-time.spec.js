// HDR-02 — Date & Time
// Source: CEPV2_Stories/04_Header.md

const { test, expect } = require('../../fixtures');
const { HeaderPage } = require('../../pages/header.page');

test.describe('HDR-02 Date & Time', () => {
  // The time and the date are one test each (split 2026-09-28): HDR-02-01/05 against the app's clock, HDR-02-04/06
  // against the computer's.
  const readShown = async (user) => {
    await expect(user.header.calendar).toBeVisible();
    const shown = await user.header.readDateTime();
    expect(shown.shown.length, 'not blank').toBeGreaterThan(0);
    return shown;
  };

  test(
    'HDR-02-01: the header shows a correct, non-blank time',
    { tag: ['@smoke', '@regression'] },
    async ({ user }) => {
      const shown = await readShown(user);
      expect(shown.shownMinutes, `a time in "${shown.shown}"`).not.toBeNull();
      expect(
        HeaderPage.minuteGap(shown.shownMinutes, shown.nowMinutes),
        'time matches the real clock'
      ).toBeLessThanOrEqual(2);
    }
  );

  test(
    'HDR-02-05: the header shows a correct, non-blank date',
    { tag: ['@smoke', '@regression'] },
    async ({ user }) => {
      const shown = await readShown(user);
      expect(shown.shownDate, `a date in "${shown.shown}"`).not.toBeNull();
      expect(shown.shownDate, 'date matches today').toBe(shown.nowDate);
    }
  );

  test(
    'HDR-02-02: the date/time stays accurate after being idle for several minutes',
    { tag: ['@long', '@functional'] },
    async ({ user }) => {
      // Under 4 minutes: after 4 minutes idle the inactivity warning appears, and a minute later the teacher is signed
      // out (owner-stated rule, 2026-09-28; LOG-05-07/09), which would cut this idle-clock check short.
      const idleMinutes = Number(process.env.HEADER_IDLE_MINUTES || 3.5);
      test.setTimeout((idleMinutes + 3) * 60 * 1000);

      const before = await user.header.readDateTime();
      await user.page.waitForTimeout(idleMinutes * 60 * 1000);
      const after = await user.header.readDateTime();

      expect(after.shown, 'still not blank').not.toBe('');
      expect(
        HeaderPage.minuteGap(after.shownMinutes, after.nowMinutes),
        'still matches the real clock'
      ).toBeLessThanOrEqual(2);
      // It must have actually moved on, not frozen at the value from before the idle period.
      expect(HeaderPage.minuteGap(after.shownMinutes, before.shownMinutes)).toBeGreaterThanOrEqual(idleMinutes - 2);
    }
  );

  test(
    'HDR-02-03: the time in the header moves forward on its own, without reloading',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      test.setTimeout(150000);
      const start = await user.header.readDateTime();
      expect(start.shownMinutes).not.toBeNull();
      // Wait (at most ~70 s) for the displayed minute to tick over, with no reload in between.
      await expect
        .poll(async () => (await user.header.readDateTime()).shownMinutes, { timeout: 75000, intervals: [5000] })
        .not.toBe(start.shownMinutes);
      const later = await user.header.readDateTime();
      expect(
        HeaderPage.minuteGap(later.shownMinutes, start.shownMinutes),
        'moved forward by about a minute'
      ).toBeLessThanOrEqual(2);
      await expect(page).toHaveURL(/teach/);
    }
  );

  test('HDR-02-04: the time shown matches the computer clock', { tag: ['@functional'] }, async ({ user }) => {
    const shown = await user.header.readDateTime();
    const now = new Date(); // the test machine's own clock, not the app's
    expect(
      HeaderPage.minuteGap(shown.shownMinutes, now.getHours() * 60 + now.getMinutes()),
      `"${shown.shown}" vs the computer's time`
    ).toBeLessThanOrEqual(1);
  });

  test('HDR-02-06: the date shown matches the computer clock', { tag: ['@functional'] }, async ({ user }) => {
    const shown = await user.header.readDateTime();
    const nowDate = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    expect(shown.shownDate, "matches the computer's date").toBe(nowDate);
  });
});
