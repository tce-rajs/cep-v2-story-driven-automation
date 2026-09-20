// TB-08 — Magnet menu
// Source: CEPV2_Stories/05_Toolbar.md
// Magnet's entries are gated per class/subject. Class 12A Physics ('default' in config/moduleClassMap.js) is
// the confirmed class where Notice, Learning Shorts, Homework and Attendance can all be reached.

const { test, expect } = require('../../fixtures');

test.describe('TB-08 Magnet menu', () => {
  test.beforeEach(async ({ user }) => {
    await user.nav.applyClassMap('default');
  });

  test(
    'TB-08-01: opening Magnet shows the expected set of quick-access tools',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await user.magnet.open();
      for (const [name, item] of Object.entries(user.magnet.items)) {
        await expect.soft(item, `Magnet entry: ${name}`).toBeVisible();
      }
    }
  );

  const opens = [
    ['TB-08-02', 'Notice', 'notice', 'AI Notices'],
    ['TB-08-03', 'Learning Shorts', 'learningShorts', 'Learning Shorts'],
    ['TB-08-04', 'Homework', 'homework', 'AI Homework'],
    ['TB-08-05', 'Attendance', 'attendance', 'Attendance'],
  ];
  for (const [id, label, key, opensWhat] of opens) {
    test(
      `${id}: selecting ${label} from Magnet opens ${opensWhat} correctly`,
      { tag: ['@functional'] },
      async ({ user }) => {
        await user.magnet.choose(key);
        await expect(user.magnet.panels[key], `${opensWhat} opened`).toBeVisible({ timeout: 15000 });
      }
    );
  }

  test(
    'TB-08-06: clicking two different Magnet items back-to-back, before the first panel opens, does not leave the UI broken',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await user.magnet.open();
      await user.magnet.homeworkItem.click({ force: true, timeout: 5000 });
      await user.magnet.learningShortsItem.click({ force: true, timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(4000);

      // Not broken: the app is alive and never shows two of these panels stacked on each other.
      expect((await page.locator('body').innerText()).trim().length).toBeGreaterThan(20);
      const open = await Promise.all(
        Object.values(user.magnet.panels).map((panel) => panel.isVisible().catch(() => false))
      );
      expect(open.filter(Boolean).length, 'at most one Magnet panel is open').toBeLessThanOrEqual(1);
      await expect(user.toolbar.container).toBeVisible();
      expect(errors, 'no uncaught page errors').toEqual([]);
    }
  );
});
