// CHK-05 — Principal views the results
// Source: CEPV2_Stories/21_Checkpoints.md
// Runs in the browser with the principal account (PRINCIPAL_PIN). The checkpoint report used is the class map's
// 'checkpoints' class (Class 10A Science) and checkpoint, which students take in chk-01-04-checkpoint-flow.spec.js.

const { test, expect } = require('../../fixtures');
const { CP, GRADE, DIVISION, createCheckpointBaselineTest } = require('./chk-helpers');

const GRADE_ORDER = ['Nursery', 'Junior KG', 'Senior KG', ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];

test.describe('CHK-05 Principal views the results', () => {
  test.describe.configure({ timeout: 180000 });

  /** Sign in as the principal and open Plan Mode. */
  const openPlanAsPrincipal = async (app) => {
    await app.guest.open();
    await app.signIn(process.env.PRINCIPAL_PIN);
    const { switched } = await app.compass.switchToPlanningMode();
    expect(switched, 'set-up: Plan Mode opened').toBe(true);
    await app.page.waitForTimeout(5000);
  };

  /** Assessment for Learning -> Baseline, on the checkpoint class. */
  const openBaselineReport = async (app) => {
    await openPlanAsPrincipal(app);
    await app.plan.openReport('Assessment for Learning');
    await app.plan.aflBaselineBtn.click();
    await app.page.waitForTimeout(3000);
    await app.plan.aflGradeSelect.selectOption({ label: GRADE });
    await app.page.waitForTimeout(2500);
    await app.plan.aflClassSelect.selectOption({ label: DIVISION });
    await app.page.waitForTimeout(2500);
    await app.plan.aflSubjectSelect.selectOption({ label: CP.subject });
    await app.page.waitForTimeout(4000);
  };

  const reportText = async (app) => (await app.page.locator('body').innerText()).replace(/\s+/g, ' ');

  test(
    "CHK-05-01: the principal's Plan Mode shows Reports & Analytics",
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      await openPlanAsPrincipal(app);
      await expect(app.plan.reportsLink.first()).toBeAttached({ timeout: 15000 });
    }
  );

  test(
    'CHK-05-02: Reports & Analytics has the Principal Dashboard, School Usage, Content Statistics and Assessment for Learning tabs',
    { tag: ['@functional'] },
    async ({ app }) => {
      await openPlanAsPrincipal(app);
      await app.plan.reportsLink.first().click({ force: true });
      await expect(app.plan.reportTabs.first()).toBeVisible({ timeout: 20000 });
      const tabs = (await app.plan.reportTabs.allInnerTexts()).map((t) => t.trim());
      for (const name of ['Principal Dashboard', 'School Usage', 'Content Statistics', 'Assessment for Learning'])
        expect(tabs, name).toContain(name);
    }
  );

  test(
    'CHK-05-03: Assessment for Learning offers Baseline and Revision, and Grade, Class, Subject and Assessment filters',
    { tag: ['@functional'] },
    async ({ app }) => {
      await openPlanAsPrincipal(app);
      await app.plan.openReport('Assessment for Learning');
      await expect(app.plan.aflBaselineBtn).toBeVisible({ timeout: 15000 });
      await expect(app.plan.aflRevisionBtn).toBeVisible();
      for (const s of [
        app.plan.aflGradeSelect,
        app.plan.aflClassSelect,
        app.plan.aflSubjectSelect,
        app.plan.aflAssessmentSelect,
      ])
        await expect(s).toBeAttached();
    }
  );

  test(
    'CHK-05-04: the Grade list is in order (Nursery, Junior KG, Senior KG, Class 1 to Class 12)',
    { tag: ['@functional'] },
    async ({ app }) => {
      await openPlanAsPrincipal(app);
      await app.plan.openReport('Assessment for Learning');
      const grades = await app.plan.optionsOf(app.plan.aflGradeSelect);
      const known = grades.filter((g) => GRADE_ORDER.includes(g));
      const sorted = [...known].sort((a, b) => GRADE_ORDER.indexOf(a) - GRADE_ORDER.indexOf(b));
      expect(known, `grades as listed: ${grades.join(', ')}`).toEqual(sorted);
    }
  );

  test(
    "CHK-05-05: Baseline lists the chosen class's checkpoints",
    { tag: ['@functional'] },
    async ({ app, browser }) => {
      const baselineTitle = await createCheckpointBaselineTest(browser);
      await openBaselineReport(app);
      const assessments = await app.plan.optionsOf(app.plan.aflAssessmentSelect);
      expect(assessments, `the created Baseline Test "${baselineTitle}" is listed`).toContain(baselineTitle);
    }
  );

  test(
    "CHK-05-06: a checkpoint's report shows overall mastery, concept mastery and students by performance band",
    { tag: ['@functional'] },
    async ({ app }) => {
      await openBaselineReport(app);
      await app.plan.aflAssessmentSelect.selectOption({ label: CP.checkpointTitle });
      await app.page.waitForTimeout(4000);
      await expect(app.page.getByText('OVERALL MASTERY', { exact: false }).first()).toBeVisible({ timeout: 15000 });
      expect(await reportText(app), 'concept mastery').toMatch(/Concept mastery/i);
      const text = await reportText(app);
      for (const band of ['Needs Support 0–40%', 'Developing 41–65%', 'Proficient 66–80%', 'Advanced 81–100%'])
        expect(text, band).toContain(band);
    }
  );

  test(
    'CHK-05-07: a student who submitted the checkpoint appears in its report with their score',
    { tag: ['@regression'] },
    async ({ app }) => {
      await openBaselineReport(app);
      await app.plan.aflAssessmentSelect.selectOption({ label: CP.checkpointTitle });
      await app.page.waitForTimeout(4000);
      const text = await reportText(app);
      expect(text, 'at least one student listed with a percentage').toMatch(/Section \d+[A-Z] \d+%/);
      expect(text, 'learners counted').not.toMatch(/\b0 learners\b/);
    }
  );

  test(
    'CHK-05-08: the report shown when the page opens matches the assessment selected',
    { tag: ['@regression'] },
    async ({ app }) => {
      await openBaselineReport(app);
      const first = (await reportText(app)).match(/OVERALL MASTERY.*?Grade \d+ \S+/)?.[0] || '';
      const selected = await app.plan.aflAssessmentSelect.inputValue();
      await app.plan.aflAssessmentSelect.selectOption(selected); // choose the same assessment again
      await app.page.waitForTimeout(4000);
      const again = (await reportText(app)).match(/OVERALL MASTERY.*?Grade \d+ \S+/)?.[0] || '';
      expect(again, 'the same assessment shows the same report').toBe(first);
    }
  );

  test('CHK-05-09: the student search finds a student in the report', { tag: ['@functional'] }, async ({ app }) => {
    await openBaselineReport(app);
    await app.plan.aflAssessmentSelect.selectOption({ label: CP.checkpointTitle });
    await app.page.waitForTimeout(4000);
    const name = ((await reportText(app)).match(/[A-Z]{2} ([A-Z][a-z]+ [A-Z][a-z]+) Section/) || [])[1];
    test.skip(!name, 'Needs a student in the report (the checkpoint flow spec adds one)');
    await app.plan.aflStudentSearch.fill(name.split(' ')[0]);
    await app.page.waitForTimeout(2000);
    await expect(app.page.getByText(name).first()).toBeVisible();
  });

  test(
    "CHK-05-10: a teacher's Plan Mode does not show Reports & Analytics",
    { tag: ['@negative'] },
    async ({ app }) => {
      await app.guest.open();
      await app.signIn(process.env.PLAN_PIN);
      await app.compass.switchToPlanningMode();
      await app.page.waitForTimeout(5000);
      await expect(app.plan.sidebarLink('Check Point'), 'set-up: Plan Mode sidebar').toBeAttached({ timeout: 15000 });
      await expect(app.plan.reportsLink).toHaveCount(0);
    }
  );
});
