// PRE-02 — Header displays correctly
// Source: CEPV2_Stories/01_WithoutLogin.md

const { test, expect } = require('../../fixtures/electron-app');
const { WithoutLoginPage } = require('../../pages/without-login.page');

test.describe('PRE-02 Header displays correctly', () => {
  test.beforeEach(async ({ page }) => {
    await new WithoutLoginPage(page).open();
  });

  test(
    'PRE-02-01: the logo and version number display in the top-left corner',
    { tag: ['@smoke', '@positive'] },
    async ({ page }) => {
      const app = new WithoutLoginPage(page);
      await expect(app.logoContainer).toBeVisible();
      await expect(app.logoImage).toBeVisible();
      await expect(app.versionText).toBeVisible();
      await expect(app.versionText).toHaveText(/^v\s*\d+\.\d+\.\d+/);

      const { width, height } = await app.viewportSize();
      for (const el of [app.logoContainer, app.versionText]) {
        const box = await el.boundingBox();
        expect(box.x, 'left of centre').toBeLessThan(width * 0.15);
        expect(box.y, 'top of screen').toBeLessThan(height * 0.2);
      }
    }
  );

  test(
    'PRE-02-02: the date and time display in the top-right corner',
    { tag: ['@smoke', '@positive'] },
    async ({ page }) => {
      const app = new WithoutLoginPage(page);
      await expect(app.calendar).toBeVisible();

      const { width, height } = await app.viewportSize();
      const box = await app.calendar.boundingBox();
      expect(box.x + box.width, 'right edge near right of screen').toBeGreaterThan(width * 0.9);
      expect(box.y, 'top of screen').toBeLessThan(height * 0.15);

      // Displayed text is e.g. "08\n:\n10\nPM\n\nSat, Sep 19" -- collapse whitespace and
      // compare against the app's own clock, so this checks the values are CURRENT,
      // not just that some digits are on screen.
      const shown = (await app.calendar.innerText()).replace(/\s+/g, ' ').trim();
      const time = shown.match(/(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)/i);
      const date = shown.match(/([A-Za-z]{3}),\s*([A-Za-z]{3})\s+(\d{1,2})/);
      expect(time, `time in "${shown}"`).not.toBeNull();
      expect(date, `date in "${shown}"`).not.toBeNull();

      const now = await page.evaluate(() => {
        const d = new Date();
        return {
          minutes: d.getHours() * 60 + d.getMinutes(),
          date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        };
      });
      let hours = Number(time[1]) % 12;
      if (time[3].toUpperCase() === 'PM') hours += 12;
      const shownMinutes = hours * 60 + Number(time[2]);
      const gap = Math.abs(shownMinutes - now.minutes);
      expect(Math.min(gap, 1440 - gap), `displayed ${time[0]} vs current time`).toBeLessThanOrEqual(2);
      expect(`${date[1]}, ${date[2]} ${date[3]}`).toBe(now.date);
    }
  );
});
