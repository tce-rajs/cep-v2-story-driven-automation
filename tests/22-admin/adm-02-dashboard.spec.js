// ADM-02 — Dashboard overview (Admin panel, read-only)
// Source: CEPV2_Stories/22_Admin.md
const { test, expect, AdminPage } = require('./admin-helpers');

/** The number shown next to a label on the OVERVIEW, e.g. "ClassRoom Terminals:" → 10. */
async function overviewNumber(page, label) {
  const text = (await page.locator('tce-planning-dashboard').innerText()).replace(/\s+/g, ' ');
  const m = text.match(new RegExp(`${label}\\s*:?\\s*(\\d+)`, 'i'));
  return m ? Number(m[1]) : null;
}

test.describe('ADM-02 Dashboard overview', () => {
  test.skip(!AdminPage.configured, 'set ADMIN_* in .env');

  test(
    'ADM-02-01: OVERVIEW shows the school name "C P Goenka International School"',
    { tag: ['@smoke', '@functional'] },
    async ({ admin }) => {
      await admin.openOverview();
      await expect(admin.page.locator('tce-planning-dashboard')).toContainText(
        /School Name:\s*C P Goenka International School/
      );
    }
  );

  test('ADM-02-02: OVERVIEW shows board "CBSE"', { tag: ['@functional'] }, async ({ admin }) => {
    await admin.openOverview();
    await expect(admin.page.locator('tce-planning-dashboard')).toContainText(/Board Name:\s*CBSE\b/);
  });

  test(
    'ADM-02-03: OVERVIEW shows the curriculum "CBSE_CE Crystal Sales Curriculum"',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openOverview();
      await expect(admin.page.locator('tce-planning-dashboard')).toContainText(
        /Curriculum Name:\s*CBSE_CE Crystal Sales Curriculum/
      );
    }
  );

  for (const [id, label, what] of [
    ['ADM-02-04', 'ClassRoom Terminals', 'classroom'],
    ['ADM-02-05', 'Teacher Terminals', 'teacher'],
  ]) {
    test(
      `${id}: OVERVIEW shows the ${what} terminal allowance that View School shows`,
      { tag: ['@functional'] },
      async ({ admin }) => {
        await admin.openOverview();
        const shown = await overviewNumber(admin.page, label);
        expect(shown, `OVERVIEW shows "${label}" with a number`).not.toBeNull();
        const school = await admin.viewSchoolText();
        const m = school.match(new RegExp(`${what}[^:]*terminal[^:]*:\\s*(\\d+)`, 'i'));
        expect(m, `View School shows a ${what} terminal allowance`).not.toBeNull();
        expect(Number(m[1])).toBe(shown);
      }
    );
  }

  test(
    'ADM-02-06: MANAGE shows the three Quick Action tiles: Manage School, Manage Teacher, Academic Details',
    { tag: ['@smoke', '@functional'] },
    async ({ admin }) => {
      await admin.openManage();
      for (const name of ['Manage School', 'Manage Teacher', 'Academic Details'])
        await expect(admin.quickTiles.filter({ hasText: name })).toBeVisible();
      await expect(admin.quickTiles).toHaveCount(3);
    }
  );

  test(
    'ADM-02-07: the Quick Action tiles show only their titles, without internal names such as "manage-school"',
    { tag: ['@regression'] },
    async ({ admin }) => {
      await admin.openManage();
      for (const internal of ['manage-school', 'manage-teacher', 'academic-details'])
        await expect(
          admin.quickTiles.getByText(internal, { exact: true }),
          `"${internal}" shown on a tile`
        ).toBeHidden();
    }
  );

  test(
    'ADM-02-08: School Settings opens the School Settings window on School Grades',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openOverview();
      await admin.schoolSettingsButton.click();
      await expect(admin.modal).toContainText(/School Settings\s*:\s*C P Goenka International School/);
      await expect(admin.modal.getByRole('tab', { name: 'School Grades' })).toHaveAttribute('aria-selected', 'true');
      await expect(admin.modal.locator('table')).toContainText('Grade Name');
    }
  );
});
