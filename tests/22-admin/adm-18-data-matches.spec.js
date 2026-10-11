// ADM-18 — Admin data matches what users see (Admin panel + principal reports, read-only).
// Source: CEPV2_Stories/22_Admin.md
//
// The principal's dashboard is read in the browser (Plan Mode is a web page) with PRINCIPAL_PIN. What raj.shinde sees
// for 10A (13 subjects) comes from the classroom suite / exploration, because raj.shinde's session is in use by the
// desktop-client runs. ADM-18-05 and ADM-18-10 (comparing with raj.shinde's own Teach Mode screens) are not automated
// here for the same reason.
const { test, expect, AdminPage, state, openTeach, pinSignIn } = require('./admin-helpers');
const { App } = require('../../pages/app');

const TEACH_10A_SUBJECTS = [
  'History',
  'Science',
  'Hindi Literature',
  'Science Practicals',
  'Economics',
  'English Language',
  'Mathematics',
  'Geography',
  'English Literature',
  'Sanskrit Literature',
  'Political Science',
  'Computer Science',
  'Hindi Language',
];
const flat = (s) => String(s).replace(/\s+/g, ' ');

async function dailyTotals(admin) {
  await admin.openSchoolList();
  await admin.schoolMenu('Daily');
  await admin.page.locator('#totalUsers').waitFor({ timeout: 60000 });
  await admin.page.waitForTimeout(2000);
  const line = flat(await admin.page.locator('#userSummary').innerText());
  const n = (label) => Number((line.match(new RegExp(`${label}:\\s*(\\d+)`)) || [])[1]);
  const text = flat(await admin.page.locator('#pd-chartview-main-container').innerText());
  await admin.closeAllModals();
  return { users: n('Total users'), installed: n('Installed Classrooms'), text };
}

async function monthlyText(admin, tabId) {
  await admin.openSchoolList();
  await admin.schoolMenu('Monthly');
  await admin.page.getByText('School Usage Data').waitFor({ timeout: 60000 });
  await admin.page.waitForTimeout(3000);
  if (tabId) {
    await admin.page.locator(`#${tabId}`).click();
    await admin.page.waitForTimeout(3000);
  }
  const text = flat(await admin.modal.innerText());
  await admin.closeAllModals();
  return text;
}

async function terminalCount(admin) {
  await admin.openSchoolSettings('Terminal Settings');
  const rows = (await admin.allPagesRows()).filter((r) => r.length >= 4 && /\d+\.\d+\.\d+\.\d+/.test(r[2]));
  await admin.closeAllModals();
  return rows.filter((r) => /classroom/i.test(r[1])).length;
}

/** Sign in as the principal in the browser and switch to Plan Mode. */
async function principalPlan(browser) {
  const t = await openTeach(browser);
  const app = new App(t.page);
  await app.signIn(process.env.PRINCIPAL_PIN);
  const { switched } = await app.compass.switchToPlanningMode();
  if (!switched) throw new Error('Plan Mode did not open for the principal');
  await t.page.waitForTimeout(4000);
  return { t, app };
}

test.describe('ADM-18 Admin data matches what users see', () => {
  test.describe.configure({ timeout: 240000 });
  test.skip(!AdminPage.configured, 'set ADMIN_* in .env');

  test(
    'ADM-18-01: the number of users in the Teacher\'s List equals "Total users" on the principal\'s dashboard',
    { tag: ['@functional'] },
    async ({ admin, browser }) => {
      test.skip(!process.env.PRINCIPAL_PIN, 'needs PRINCIPAL_PIN in .env');
      test.setTimeout(4 * 60000);
      await admin.openTeachers();
      const listed = await admin.recordsFound();
      const { t, app } = await principalPlan(browser);
      try {
        await app.plan.openReport('Principal Dashboard');
        await t.page
          .getByText(/Total users/)
          .first()
          .waitFor({ timeout: 60000 });
        await t.page.waitForTimeout(2000);
        const m = flat(await t.page.locator('body').innerText()).match(/Total users:?\s*(\d+)/);
        expect(m, 'the principal dashboard shows Total users').not.toBeNull();
        expect(Number(m[1]), `principal Total users vs Teacher's List ${listed} (Admin F-09)`).toBe(listed);
      } finally {
        await t.context.close();
      }
    }
  );

  test(
    'ADM-18-02: the number of users in the Teacher\'s List equals "Total users" in the Daily Report',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openTeachers();
      const listed = await admin.recordsFound();
      const daily = await dailyTotals(admin);
      expect(daily.users).toBe(listed);
    }
  );

  test(
    'ADM-18-03: "Registered Users" in the Monthly report equals the number of school users in the Teacher\'s List',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openTeachers();
      const listed = await admin.recordsFound();
      const text = await monthlyText(admin, 'user-wise-trends-tab');
      const m = text.match(/Registered Users:?\s*(\d+)/i);
      expect(m, 'the Monthly report shows Registered Users').not.toBeNull();
      expect(Number(m[1]), 'Admin F-09').toBe(listed);
    }
  );

  test(
    'ADM-18-04: the subjects of Class 10 in School Subjects equal the subjects raj.shinde sees for 10A',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openSchoolSettings('School Subjects');
      const row = admin.modal
        .locator('table tbody tr')
        .filter({ hasText: /^\s*Class 10\b/ })
        .first();
      const subjects = (await row.locator('.ng-value-label').allInnerTexts()).map((s) => s.trim());
      expect(subjects.sort()).toEqual([...TEACH_10A_SUBJECTS].sort());
    }
  );

  test(
    'ADM-18-06: a teacher signed in on the panel today appears in the Daily Report',
    { tag: ['@functional'] },
    async ({ admin, browser }) => {
      // The AutoQA teacher of this run signs in now (or did earlier in ADM-10/11).
      const d = state.teacher('adm-teacher');
      if (d.pin) {
        const t = await openTeach(browser);
        try {
          await pinSignIn(t, d.pin);
          await t.page.waitForTimeout(5000);
        } finally {
          await t.context.close();
        }
      }
      const daily = await dailyTotals(admin);
      expect(daily.text, `AutoQA ${d.last} in the Daily Report`).toMatch(new RegExp(`AutoQA ${d.last.slice(0, 4)}`));
    }
  );

  test(
    'ADM-18-07: the number of classroom terminals in Terminal Settings equals "Installed Classrooms" in the Daily Report',
    { tag: ['@functional'] },
    async ({ admin }) => {
      const terminals = await terminalCount(admin);
      const daily = await dailyTotals(admin);
      expect(daily.installed).toBe(terminals);
    }
  );

  test(
    'ADM-18-08: "No. of Classroom Terminals" in the Monthly report equals the terminals in Terminal Settings',
    { tag: ['@functional'] },
    async ({ admin }) => {
      const terminals = await terminalCount(admin);
      const text = await monthlyText(admin);
      const m = text.match(/No\. of Classroom Terminals\s*(\d+)/);
      expect(m, 'the Monthly report shows No. of Classroom Terminals').not.toBeNull();
      expect(Number(m[1]), 'Admin F-12').toBe(terminals);
    }
  );

  test(
    "ADM-18-09: a principal in the Teacher's List can open Reports & Analytics, and a teacher cannot",
    { tag: ['@functional'] },
    async ({ admin, browser }) => {
      test.skip(!process.env.PRINCIPAL_PIN, 'needs PRINCIPAL_PIN in .env');
      test.setTimeout(5 * 60000);
      await admin.openTeachers();
      await admin.filterTeachers('Principal');
      expect((await admin.teacherRows()).length, 'principals listed').toBeGreaterThan(0);
      const { t, app } = await principalPlan(browser);
      try {
        await app.plan.openReport('Principal Dashboard');
        await expect(app.plan.reportTab('Principal Dashboard')).toBeVisible();
      } finally {
        await t.context.close();
      }
      // A teacher: the AutoQA teacher of this run.
      const d = state.teacher('adm-teacher');
      if (!d.pin) throw new Error('DATA MISSING ON THIS SERVER: the AutoQA teacher has no PIN (ADM-10-14 failed)');
      const t2 = await openTeach(browser);
      try {
        const o = await pinSignIn(t2, d.pin);
        expect(o.screen, o.message).toBe('signed-in');
        const teacherApp = new App(t2.page);
        const { switched } = await teacherApp.compass.switchToPlanningMode();
        if (!switched) throw new Error('DATA MISSING ON THIS SERVER: Plan Mode did not open for the AutoQA teacher');
        await t2.page.waitForTimeout(4000);
        await expect(teacherApp.plan.reportsLink, 'a teacher has no Reports & Analytics').toHaveCount(0);
      } finally {
        await t2.context.close();
      }
    }
  );
});
