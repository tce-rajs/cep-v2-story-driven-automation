// LS-01 — Open the Learning Shorts recorder
// Source: CEPV2_Stories/14_LearningShorts.md

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'default' });

test.describe('LS-01 Open the Learning Shorts recorder', () => {
  test.afterEach(async ({ app }) => {
    await app.learningShorts.closeAll();
  });

  test(
    'LS-01-01: Magnet → Learning Shorts opens the recorder with Record and Exit (regression, Zoho CWR-I678)',
    { tag: ['@smoke', '@regression'] },
    async ({ user }) => {
      await user.learningShorts.openRecorder(user.magnet);
      await expect(user.learningShorts.recordStartBtn).toBeVisible();
      await expect(user.learningShorts.exitBtn).toBeVisible();
    }
  );

  // Exit without recording: the panel closes cleanly (LS-01-02), and no composer or video is produced (LS-01-04) -- one
  // test each (split 2026-09-28).
  test(
    'LS-01-02: Exit without recording closes the recorder panel cleanly',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      const ls = user.learningShorts;
      await ls.openRecorder(user.magnet);
      await ls.exitBtn.click({ force: true });
      await expect(ls.recordStartBtn).toBeHidden({ timeout: 5000 });
      await expect(ls.exitBtn).toBeHidden();
      expect(errors, 'no uncaught page errors').toEqual([]);
    }
  );

  test(
    'LS-01-04: Exit without recording opens no composer, since nothing was recorded',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const ls = user.learningShorts;
      await ls.openRecorder(user.magnet);
      await ls.exitBtn.click({ force: true });
      await page.waitForTimeout(2000);
      await expect(ls.titleInput, 'no composer, since nothing was recorded').toBeHidden();
    }
  );

  test(
    'LS-01-03: opening and exiting the recorder 5 times leaves one clean panel',
    { tag: ['@edge'] },
    async ({ user }) => {
      const ls = user.learningShorts;
      for (let i = 0; i < 5; i++) {
        await ls.openRecorder(user.magnet);
        await ls.exitBtn.click({ force: true });
        await expect(ls.recordStartBtn).toBeHidden({ timeout: 5000 });
      }
      await ls.openRecorder(user.magnet);
      await expect(ls.recordStartBtn, 'exactly one recorder').toHaveCount(1);
      await expect(ls.exitBtn).toHaveCount(1);
    }
  );
});
