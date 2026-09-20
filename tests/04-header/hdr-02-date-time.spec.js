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
});
