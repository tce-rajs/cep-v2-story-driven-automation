// PLN-01 — Open Plan Mode and move around it
// Source: CEPV2_Stories/10_PlanMode.md

const { test, expect } = require('../../fixtures');
const { openPlanMode } = require('./plan-helpers');

test.describe('PLN-01 Open Plan Mode and move around it', () => {
  // Sign-in, class reset and the switch to Planning alone can take over a minute on a busy server.
  test.describe.configure({ timeout: 180000 });

  test.beforeEach(async ({ app }) => {
    await openPlanMode(app);
  });

  test('PLN-01-01: Classroom Mode → Planning opens Plan Mode', { tag: ['@smoke', '@functional'] }, async ({ page }) => {
    await expect(page, 'the Plan Mode app').toHaveURL(/\/plan\//);
  });

  test(
    "PLN-01-02: Plan Mode opens on the teacher's current class and subject",
    { tag: ['@functional'] },
    async ({ app }) => {
      await expect(app.plan.classSubjectHeading, 'the current class and subject').toContainText(
        /Class 12\s*\|\s*Physics/
      );
    }
  );

  test(
    'PLN-01-03: the sidebar offers Content Library, Question Bank, Code Editor and Check Point',
    { tag: ['@functional'] },
    async ({ app }) => {
      for (const name of ['Content Library', 'Question Bank', 'Code Editor', 'Check Point'])
        await expect(app.plan.sidebarLink(name), name).toBeAttached();
    }
  );

  // Each section opens from the sidebar (PLN-01-04 .. 07): one test each.
  for (const [id, name, shows] of [
    ['PLN-01-04', 'Question Bank', 'Question Bank'],
    ['PLN-01-05', 'Check Point', 'Assessment for Learning (AfL)'],
    ['PLN-01-06', 'Content Library', 'Content Library'],
    ['PLN-01-07', 'Code Editor', 'Code Editor'],
  ]) {
    test(`${id}: ${name} opens from the sidebar`, { tag: ['@functional'] }, async ({ app, page }) => {
      await app.plan.openSection(name);
      await expect(
        page.getByText(shows, { exact: true }).filter({ visible: true }).first(),
        `${name} is shown`
      ).toBeVisible({
        timeout: 10000,
      });
    });
  }

  test(
    'PLN-01-08: switching back to Teaching returns to the whiteboard',
    { tag: ['@functional'] },
    async ({ app, page }) => {
      await app.compass.switchToTeachingMode();
      await expect(page, 'back in Teach Mode').toHaveURL(/\/teach\//, { timeout: 30000 });
      await expect(app.toolbar.wbSvg, 'the whiteboard').toBeVisible({ timeout: 30000 });
    }
  );

  // The Plan Mode account is a plain teacher (no principal rights).
  test(
    'PLN-01-09: a plain teacher account does not see Reports & Analytics in Plan Mode',
    { tag: ['@negative'] },
    async ({ app }) => {
      await expect(app.plan.sidebarLink('Content Library'), 'set-up: the sidebar is shown').toBeAttached();
      await expect(app.plan.reportsLink, 'no Reports & Analytics link').toHaveCount(0);
      await expect(app.plan.reportTabs, 'no report tabs').toHaveCount(0);
    }
  );
});
