// ADM-03 — School details and licence (Admin panel, read-only)
// Source: CEPV2_Stories/22_Admin.md
const { test, expect, AdminPage } = require('./admin-helpers');

const SCHOOL = 'C P Goenka International School';

test.describe('ADM-03 School details and licence', () => {
  test.skip(!AdminPage.configured, 'set ADMIN_* in .env');

  test(
    'ADM-03-01: Manage School lists "C P Goenka International School" with curriculum, state and Last Sync On',
    { tag: ['@smoke', '@functional'] },
    async ({ admin }) => {
      await admin.openSchoolList();
      const rows = await admin.tableRows(admin.page);
      const row = rows.find((r) => r.includes(SCHOOL));
      expect(row, 'the school is listed').toBeTruthy();
      expect(row[2], 'curriculum').toMatch(/\S/);
      expect(row[3], 'state').toMatch(/\S/);
      expect(AdminPage.parseSyncDate(row[4]), `Last Sync On "${row[4]}" is a date and time`).not.toBeNull();
    }
  );

  test(
    'ADM-03-02: searching the school list by part of the name finds the school',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openSchoolList();
      await admin.searchBox.pressSequentially('Goenka', { delay: 40 });
      await admin.page.waitForTimeout(2000);
      const rows = await admin.tableRows(admin.page);
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) expect(r.join(' ')).toMatch(/Goenka/i);
    }
  );

  test(
    'ADM-03-03: searching the school list for a name that does not exist shows an empty list',
    { tag: ['@negative'] },
    async ({ admin }) => {
      await admin.openSchoolList();
      await admin.searchBox.pressSequentially('Zzqx No Such School', { delay: 40 });
      await admin.page.waitForTimeout(2500);
      expect(await admin.tableRows(admin.page)).toEqual([]);
    }
  );

  test(
    'ADM-03-04: the row menu offers View School, Settings, Sync, View Sync Status, View Daily Report and View Monthly Report',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openSchoolList();
      const items = await admin.schoolMenu();
      const texts = (await items.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
      expect(texts).toEqual([
        'View School',
        'Settings',
        'Sync',
        'View Sync Status',
        'View Daily Report',
        'View Monthly Report',
      ]);
      await admin.page.keyboard.press('Escape');
    }
  );

  test(
    "ADM-03-05: View School shows the school's name, address, state, city and pincode",
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openSchoolList();
      await admin.schoolMenu('View School');
      await admin.modal.getByText(/School Detail/).waitFor();
      await admin.page.waitForTimeout(1000);
      await expect(admin.fc('schoolName')).toHaveValue(SCHOOL);
      await expect(admin.fc('schoolAddress'), 'address').toHaveValue(/\S/);
      await expect(admin.fc('state')).toContainText(/\S/);
      await expect(admin.fc('city')).toContainText(/\S/);
      await expect(admin.fc('pincode'), 'pincode').toHaveValue(/^\d{6}$/);
    }
  );

  test(
    'ADM-03-06: View School shows the active modules ClassEdge, Widgets(S) Gold, Student Test, Attendance and EarlyEdge',
    { tag: ['@functional'] },
    async ({ admin }) => {
      const text = await admin.viewSchoolText();
      const modules = text.split(/Active Modules/i).pop();
      for (const m of ['ClassEdge', 'Widgets(S) Gold', 'Student Test', 'Attendance', 'EarlyEdge'])
        expect(modules, `active module ${m}`).toContain(m);
    }
  );

  test('ADM-03-07: View School shows the licence end date 04-05-2027', { tag: ['@functional'] }, async ({ admin }) => {
    await admin.openSchoolList();
    await admin.schoolMenu('View School');
    await admin.modal.getByText(/School Detail/).waitFor();
    await admin.page.waitForTimeout(1000);
    // The field shows yyyy-mm-dd; either way it must be 4 May 2027.
    await expect(admin.fc('endDate')).toHaveValue(/^(2027-05-04|04-05-2027)$/);
  });

  test(
    'ADM-03-08: closing View School returns to the school list with nothing changed',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openSchoolList();
      const before = await admin.tableRows(admin.page);
      await admin.schoolMenu('View School');
      await admin.modal.getByText(/School Detail/).waitFor();
      await admin.modalClose.click();
      await expect(admin.page.locator('ngb-modal-window')).toHaveCount(0);
      await expect(admin.page.getByText('School’s List')).toBeVisible();
      expect(await admin.tableRows(admin.page)).toEqual(before);
    }
  );

  test(
    'ADM-03-09: Settings from the row menu opens the same School Settings window as the Dashboard button',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openSchoolList();
      await admin.schoolMenu('Settings');
      await expect(admin.modal).toContainText(/School Settings\s*:\s*C P Goenka International School/);
      const tabs = (await admin.modal.getByRole('tab').allInnerTexts()).map((t) => t.trim());
      await admin.closeAllModals();
      await admin.openSchoolSettings('School Grades');
      const dashTabs = (await admin.modal.getByRole('tab').allInnerTexts()).map((t) => t.trim());
      expect(tabs).toEqual(dashTabs);
    }
  );
});
