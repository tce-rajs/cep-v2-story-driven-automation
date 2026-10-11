// PLN-09 — Reports & Usage (principal)
// Source: CEPV2_Stories/10_PlanMode.md
// The principal (PRINCIPAL_PIN) opens Plan Mode -> Reports & Analytics; the teacher is the main account (VALID_PIN).
// The empty report is the Assessment for Learning report of a grade with no assessments (Nursery).

const { test, expect } = require('../../fixtures');
const { BROWSER_ONLY } = require('./plan-helpers');

test.describe('PLN-09 Reports & Usage (principal)', () => {
  test.skip(!process.env.RUN_IN_BROWSER, BROWSER_ONLY);
  test.describe.configure({ timeout: 180000 });

  /** Sign in with `pin` and open Plan Mode. */
  const openPlanAs = async (app, pin) => {
    await app.guest.open();
    await app.signIn(pin);
    const { switched } = await app.compass.switchToPlanningMode();
    expect(switched, 'set-up: Plan Mode opened').toBe(true);
    await app.page.waitForTimeout(5000);
  };

  test(
    'PLN-09-01: a principal account can open Reports & Usage',
    { tag: ['@smoke', '@functional'] },
    async ({ app, page }) => {
      await openPlanAs(app, process.env.PRINCIPAL_PIN);
      await app.plan.openReport('School Usage');
      await expect(
        page.getByText('School Usage Data').filter({ visible: true }).first(),
        'the usage report is shown'
      ).toBeVisible({ timeout: 20000 });
    }
  );

  test(
    "PLN-09-02: a teacher account cannot open the principal's usage view",
    { tag: ['@negative'] },
    async ({ app, page }) => {
      await openPlanAs(app, process.env.VALID_PIN);
      await expect(app.plan.sidebarLink('Check Point'), 'set-up: the teacher is in Plan Mode').toBeAttached();
      await expect(app.plan.reportsLink, 'no Reports & Analytics for a teacher').toHaveCount(0);
      await expect(page.getByText('School Usage Data'), 'no usage view').toHaveCount(0);
    }
  );

  test(
    'PLN-09-03: an empty report shows an empty-state message, not an error',
    { tag: ['@negative'] },
    async ({ app, page }) => {
      await openPlanAs(app, process.env.PRINCIPAL_PIN);
      await app.plan.openReport('Assessment for Learning');
      await app.plan.aflBaselineBtn.click();
      await page.waitForTimeout(2500);
      await app.plan.choose(app.plan.aflGradeSelect, 'Nursery');
      await page.waitForTimeout(3000);
      await expect(app.plan.aflNoReports, 'an empty-state message').toBeVisible({ timeout: 15000 });
      const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
      expect(text, 'no error, NaN or undefined on the page').not.toMatch(/\berror\b|\bNaN\b|\bundefined\b/i);
    }
  );
});
