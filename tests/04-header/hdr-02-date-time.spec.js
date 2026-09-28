// HDR-02 — Date & Time
// Source: CEPV2_Stories/04_Header.md

const { test, expect } = require('../../fixtures');
const { HeaderPage } = require('../../pages/header.page');

test.describe('HDR-02 Date & Time', () => {
  test(
    'HDR-02-01: the header Date & Time shows a correct, non-blank value',
    { tag: ['@smoke', '@regression'] },
    async ({ user }) => {
      await expect(user.header.calendar).toBeVisible();
      const shown = await user.header.readDateTime();

      expect(shown.shown.length, 'not blank').toBeGreaterThan(0);
      expect(shown.shownMinutes, `a time in "${shown.shown}"`).not.toBeNull();
      expect(shown.shownDate, `a date in "${shown.shown}"`).not.toBeNull();
      expect(
        HeaderPage.minuteGap(shown.shownMinutes, shown.nowMinutes),
        'time matches the real clock'
      ).toBeLessThanOrEqual(2);
      expect(shown.shownDate, 'date matches today').toBe(shown.nowDate);
    }
  );

  test(
    'HDR-02-02: the date/time stays accurate after being idle for several minutes',
    { tag: ['@long', '@functional'] },
    async ({ user }) => {
      const idleMinutes = Number(process.env.HEADER_IDLE_MINUTES || 5);
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

  test('HDR-02-04: the date and time shown match the computer clock', { tag: ['@functional'] }, async ({ user }) => {
    const shown = await user.header.readDateTime();
    const now = new Date(); // the test machine's own clock, not the app's
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const nowDate = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    expect(
      HeaderPage.minuteGap(shown.shownMinutes, nowMinutes),
      `"${shown.shown}" vs the computer's time`
    ).toBeLessThanOrEqual(1);
    expect(shown.shownDate, "matches the computer's date").toBe(nowDate);
  });
});
