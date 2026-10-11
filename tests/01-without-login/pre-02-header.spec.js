// PRE-02 — Header displays correctly
// Source: CEPV2_Stories/01_WithoutLogin.md
// One test per item: the logo (01) and the version number (03) top-left; the time (02) and the date (04) top-right.

const { test, expect } = require('../../fixtures/electron-app');
const { WithoutLoginPage } = require('../../pages/without-login.page');

/** The element is in the top-left corner of the window. */
const expectTopLeft = async (app, el) => {
  const { width, height } = await app.viewportSize();
  const box = await el.boundingBox();
  expect(box.x, 'left of centre').toBeLessThan(width * 0.15);
  expect(box.y, 'top of screen').toBeLessThan(height * 0.2);
};

/** The calendar is in the top-right corner; returns its text with whitespace collapsed, e.g. "08: 10 PM Sat, Sep 19". */
const calendarText = async (app) => {
  await expect(app.calendar).toBeVisible();
  const { width, height } = await app.viewportSize();
  const box = await app.calendar.boundingBox();
  expect(box.x + box.width, 'right edge near right of screen').toBeGreaterThan(width * 0.9);
  expect(box.y, 'top of screen').toBeLessThan(height * 0.15);
  return (await app.calendar.innerText()).replace(/\s+/g, ' ').trim();
};

/** The app's own clock (the displayed values are compared with it, so the check is that they are CURRENT). */
const appNow = (page) =>
  page.evaluate(() => {
    const d = new Date();
    return {
      minutes: d.getHours() * 60 + d.getMinutes(),
      date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    };
  });

test.describe('PRE-02 Header displays correctly', () => {
  test.beforeEach(async ({ page }) => {
    await new WithoutLoginPage(page).open();
  });

  test('PRE-02-01: the logo displays in the top-left corner', { tag: ['@smoke', '@positive'] }, async ({ page }) => {
    const app = new WithoutLoginPage(page);
    await expect(app.logoContainer).toBeVisible();
    await expect(app.logoImage).toBeVisible();
    await expectTopLeft(app, app.logoContainer);
  });

  test(
    'PRE-02-03: the version number displays in the top-left corner',
    { tag: ['@smoke', '@positive'] },
    async ({ page }) => {
      const app = new WithoutLoginPage(page);
      await expect(app.versionText).toBeVisible();
      await expect(app.versionText).toHaveText(/^v\s*\d+\.\d+\.\d+/);
      await expectTopLeft(app, app.versionText);
    }
  );

  test(
    'PRE-02-02: the current time displays in the top-right corner',
    { tag: ['@smoke', '@positive'] },
    async ({ page }) => {
      const app = new WithoutLoginPage(page);
      const shown = await calendarText(app);
      const time = shown.match(/(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)/i);
      expect(time, `time in "${shown}"`).not.toBeNull();
      const now = await appNow(page);
      let hours = Number(time[1]) % 12;
      if (time[3].toUpperCase() === 'PM') hours += 12;
      const gap = Math.abs(hours * 60 + Number(time[2]) - now.minutes);
      expect(Math.min(gap, 1440 - gap), `displayed ${time[0]} vs current time`).toBeLessThanOrEqual(2);
    }
  );

  test(
    'PRE-02-04: the current date displays in the top-right corner',
    { tag: ['@smoke', '@positive'] },
    async ({ page }) => {
      const app = new WithoutLoginPage(page);
      const shown = await calendarText(app);
      const date = shown.match(/([A-Za-z]{3}),\s*([A-Za-z]{3})\s+(\d{1,2})/);
      expect(date, `date in "${shown}"`).not.toBeNull();
      // The header pads the day ("Oct 01"), the clock's format does not ("Oct 1"): compare the day as a number.
      expect(`${date[1]}, ${date[2]} ${Number(date[3])}`, 'the current date').toBe((await appNow(page)).date);
    }
  );

  test(
    'PRE-02-05: the time shown moves on to the next minute while the app stays open',
    { tag: ['@functional'] },
    async ({ page }) => {
      test.setTimeout(150000);
      const app = new WithoutLoginPage(page);
      const minuteOf = async () =>
        (await calendarText(app))
          .match(/(\d{1,2})\s*:\s*(\d{2})/)
          .slice(1)
          .join(':');
      const first = await minuteOf();
      await expect
        .poll(minuteOf, { message: 'the clock moves on within a minute', timeout: 70000, intervals: [5000] })
        .not.toBe(first);
    }
  );

  test(
    'PRE-02-06: the header never shows a blank, "undefined" or placeholder value for the version, date or time',
    { tag: ['@negative'] },
    async ({ page }) => {
      const app = new WithoutLoginPage(page);
      const junk = /undefined|null|NaN|invalid date|\{\{|\}\}|--:--/i;
      const version = (await app.versionText.innerText()).trim();
      expect(version, 'the version is not blank').not.toBe('');
      expect(version, 'the version is a real number').toMatch(/^v\s*\d+\.\d+\.\d+/);
      expect(version, 'no placeholder in the version').not.toMatch(junk);
      const shown = await calendarText(app);
      expect(shown, 'no placeholder in the date or time').not.toMatch(junk);
      expect(shown, 'a time is shown').toMatch(/\d{1,2}\s*:\s*\d{2}\s*(AM|PM)/i);
      expect(shown, 'a date is shown').toMatch(/[A-Za-z]{3},\s*[A-Za-z]{3}\s+\d{1,2}/);
    }
  );
});
