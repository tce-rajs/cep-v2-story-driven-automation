// FLOW-24 — School settings from Admin show in the classroom (Admin panel + Teach Mode, read-only).
// Source: CEPV2_Stories/00_EndToEndFlows.md
//
// Admin is a web page (Playwright's own browser page). The teacher side: the AutoQA teacher of this run's Admin tests
// (tests/22-admin) for the classes a teacher can choose, and — because raj.shinde's session is in use by the
// desktop-client runs — what raj.shinde sees for 10A (13 subjects, 30 students in the register) as recorded by the
// classroom suite. FLOW-24-04 (cut-off used by the register) and FLOW-24-05 (licence and modules vs the features a
// teacher can use) need raj.shinde's own Teach Mode and are not automated here.
const { test, expect, AdminPage, state, openTeach, pinSignIn } = require('../22-admin/admin-helpers');
const { NavigationPage } = require('../../pages/navigation.page');

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
const TEACH_10A_STUDENTS = 30;
const flat = (s) => String(s).replace(/\s+/g, ' ');

async function openClass(admin, grade, division) {
  await admin.openAcademicDetails();
  await admin.page
    .locator('div[fxlayout="row"]')
    .filter({ has: admin.page.locator('.all-classes-list__grade', { hasText: new RegExp(`^\\s*${grade}\\s*$`) }) })
    .locator('mat-card')
    .filter({ hasText: division })
    .first()
    .click();
  await admin.page
    .getByText(new RegExp(`${grade}\\s*-\\s*${division}`))
    .first()
    .waitFor({ timeout: 20000 });
  await admin.page.waitForTimeout(1500);
}

test.describe('FLOW-24 School settings from Admin show in the classroom', () => {
  test.describe.configure({ timeout: 240000 });
  test.skip(!AdminPage.configured, 'set ADMIN_* in .env');

  test(
    'FLOW-24-01: the grades in Admin are the grades teachers can choose',
    { tag: ['@functional'] },
    async ({ admin, browser }) => {
      await admin.openSchoolSettings('School Grades');
      const grades = (await admin.allPagesRows()).map((r) => r[0]);
      await admin.closeAllModals();
      const d = state.get('adm-teacher');
      if (!d || !d.pin)
        throw new Error(
          'DATA MISSING ON THIS SERVER: no AutoQA teacher with a PIN from this run (tests/22-admin ADM-10)'
        );
      const t = await openTeach(browser);
      try {
        const o = await pinSignIn(t, d.pin);
        expect(o.screen, o.message).toBe('signed-in');
        const nav = new NavigationPage(t.page);
        if (
          await t.newUser.chooseClassBtn
            .first()
            .isVisible()
            .catch(() => false)
        )
          await t.newUser.chooseClassBtn.first().click();
        else await nav.openClassPopup();
        await nav.gradeButtons.first().waitFor({ timeout: 20000 });
        const offered = (await nav.gradeButtons.allInnerTexts()).map((g) => g.trim());
        expect([...new Set(offered)].sort(), 'grades a teacher can choose').toEqual([...new Set(grades)].sort());
      } finally {
        await t.context.close();
      }
    }
  );

  test(
    "FLOW-24-02: a class's subjects in Admin are the subjects the teacher sees for that class",
    { tag: ['@functional'] },
    async ({ admin }) => {
      await openClass(admin, 'Class 10', 'Division A');
      const subjects = await admin.page
        .locator('.teacher-allocation__info__subjects-list__card')
        .evaluateAll((cards) => cards.map((c) => c.children[0].innerText.trim()));
      expect(subjects.sort(), '10A subjects in Admin vs Teach Mode (Admin F-10)').toEqual(
        [...TEACH_10A_SUBJECTS].sort()
      );
    }
  );

  test(
    'FLOW-24-03: the number of students in a class in Admin matches the attendance register',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await openClass(admin, 'Class 10', 'Division A');
      const text = flat(await admin.page.locator('tce-class-details').innerText());
      const m = text.match(/Students?\s*:?\s*(\d+)|(\d+)\s*Students?/i);
      expect(m, 'Admin shows how many students 10A has (Admin F-11)').not.toBeNull();
      expect(Number(m[1] || m[2])).toBe(TEACH_10A_STUDENTS);
    }
  );

  test(
    'FLOW-24-06: the counts of teachers, classes and terminals agree across Admin screens',
    { tag: ['@negative'] },
    async ({ admin }) => {
      const differ = [];
      // Teachers: Teacher's List, Daily Report, Monthly report.
      await admin.openTeachers();
      const listed = await admin.recordsFound();
      await admin.openSchoolList();
      await admin.schoolMenu('Daily');
      await admin.page.locator('#totalUsers').waitFor({ timeout: 60000 });
      await admin.page.waitForTimeout(2000);
      const daily = flat(await admin.page.locator('#userSummary').innerText());
      await admin.closeAllModals();
      const dailyUsers = Number((daily.match(/Total users:\s*(\d+)/) || [])[1]);
      const installed = Number((daily.match(/Installed Classrooms:\s*(\d+)/) || [])[1]);
      if (dailyUsers !== listed) differ.push(`users: Teacher's List ${listed}, Daily ${dailyUsers}`);
      await admin.openSchoolList();
      await admin.schoolMenu('Monthly');
      await admin.page.getByText('School Usage Data').waitFor({ timeout: 60000 });
      await admin.page.waitForTimeout(3000);
      const monthly = flat(await admin.modal.innerText());
      await admin.page.locator('#user-wise-trends-tab').click();
      await admin.page.waitForTimeout(3000);
      const userWise = flat(await admin.modal.innerText());
      await admin.closeAllModals();
      const registered = Number((userWise.match(/Registered Users:?\s*(\d+)/i) || [])[1]);
      if (registered !== listed) differ.push(`users: Teacher's List ${listed}, Monthly Registered ${registered}`);
      // Terminals: Terminal Settings, Daily, Monthly.
      await admin.openSchoolSettings('Terminal Settings');
      const terminals = (await admin.allPagesRows()).filter(
        (r) => r.length >= 4 && /\d+\.\d+\.\d+\.\d+/.test(r[2]) && /classroom/i.test(r[1])
      ).length;
      const grades = await admin.modal
        .getByRole('tab', { name: 'School Grades' })
        .click()
        .then(() => admin.allPagesRows());
      await admin.closeAllModals();
      const monthlyTerminals = Number((monthly.match(/No\. of Classroom Terminals\s*(\d+)/) || [])[1]);
      if (installed !== terminals) differ.push(`terminals: Settings ${terminals}, Daily Installed ${installed}`);
      if (monthlyTerminals !== terminals) differ.push(`terminals: Settings ${terminals}, Monthly ${monthlyTerminals}`);
      // Classes: divisions in School Grades vs Academic Details.
      await admin.openAcademicDetails();
      const academic = await admin.page
        .locator('.all-classes-list__grade')
        .evaluateAll((gs) =>
          Object.fromEntries(
            gs.map((g) => [
              g.innerText.trim(),
              [...g.parentElement.querySelectorAll('mat-card')].filter((c) => /Division/.test(c.innerText)).length,
            ])
          )
        );
      const settingsClasses = grades.reduce((n, r) => n + Number(r[3] || 0), 0);
      const academicClasses = Object.values(academic).reduce((n, c) => n + c, 0);
      if (settingsClasses !== academicClasses)
        differ.push(`classes: School Grades ${settingsClasses} divisions, Academic Details ${academicClasses}`);
      expect(differ, 'Admin F-09, F-12, F-13').toEqual([]);
    }
  );
});
