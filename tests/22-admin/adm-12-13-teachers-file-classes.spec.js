// ADM-12 Import and export teachers, ADM-13 Class structure and class details (Admin panel, read-only).
// Source: CEPV2_Stories/22_Admin.md
//
// Nothing is imported (importing changes the live school); the Import window is opened and closed.
const { test, expect, AdminPage } = require('./admin-helpers');

// What raj.shinde sees for 10A in Teach Mode / attendance (13 subjects, 30 students) — from the classroom suite and
// the exploration (report/exploration/admin.md).
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
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();

test.describe('ADM-12 Import and export teachers', () => {
  test.skip(!AdminPage.configured, 'set ADMIN_* in .env');

  test(
    'ADM-12-01: Export Teacher downloads a CSV with one row per user in the list (13)',
    { tag: ['@smoke', '@functional'] },
    async ({ admin }) => {
      const file = await admin.exportTeachers(test.info().outputDir);
      expect(file.name).toMatch(/\.csv$/i);
      const users = AdminPage.parseCsv(file.text);
      await admin.closeAllModals();
      await admin.openTeachers();
      const rows = await admin.teacherRows();
      expect(users.map((u) => u.UserName).sort()).toEqual(rows.map((r) => r[1]).sort());
    }
  );

  test(
    "ADM-12-02: the export's names, usernames, roles and statuses match the list",
    { tag: ['@functional'] },
    async ({ admin }) => {
      const users = AdminPage.parseCsv((await admin.exportTeachers(test.info().outputDir)).text);
      await admin.closeAllModals();
      await admin.openTeachers();
      const rows = await admin.teacherRows();
      await admin.filterTeachers('Principal');
      const principals = (await admin.teacherRows()).map((r) => r[1]);
      const differ = [];
      for (const [name, username, status] of rows) {
        const u = users.find((x) => x.UserName === username);
        if (!u) differ.push(`${username}: not in the export`);
        else {
          if (norm(`${u.FirstName} ${u.LastName}`) !== norm(name))
            differ.push(`${username}: name "${u.FirstName} ${u.LastName}" vs "${name}"`);
          if (u.Status !== status) differ.push(`${username}: status ${u.Status} vs ${status}`);
          const role = principals.includes(username) ? 'Principal' : 'Teacher';
          if (!new RegExp(role, 'i').test(u.Role)) differ.push(`${username}: role ${u.Role} vs ${role}`);
        }
      }
      expect(differ).toEqual([]);
    }
  );

  test("ADM-12-03: the export's subject column has no empty entries", { tag: ['@functional'] }, async ({ admin }) => {
    const users = AdminPage.parseCsv((await admin.exportTeachers(test.info().outputDir)).text);
    const blank = users
      .filter((u) => u.Subjects && u.Subjects.split(',').some((s) => !s.trim()))
      .map((u) => `${u.UserName}: "${u.Subjects}"`);
    expect(blank, 'users with an empty subject entry (Admin F-06)').toEqual([]);
  });

  test(
    'ADM-12-04: Import Teacher opens a window with file chooser, Download Sample CSV, Close and Import',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openTeachers();
      await admin.importTeacherButton.click();
      await expect(admin.modal).toContainText('Import Teacher');
      await expect(admin.modal.locator('input[type="file"]')).toHaveCount(1);
      await expect(admin.modal.getByText('Download Sample CSV')).toBeVisible();
      await expect(admin.modal.getByRole('button', { name: /^\s*Close\s*$/ })).toBeVisible();
      await expect(admin.modal.getByRole('button', { name: /^\s*Import\s*$/ })).toBeVisible();
    }
  );

  test('ADM-12-05: Download Sample CSV downloads the sample file', { tag: ['@functional'] }, async ({ admin }) => {
    await admin.openTeachers();
    await admin.importTeacherButton.click();
    const file = await admin.download(
      () => admin.modal.getByText('Download Sample CSV').click(),
      test.info().outputDir
    );
    expect(file.name).toMatch(/\.csv$/i);
    expect(file.text.split(/\r?\n/)[0]).toMatch(/firstName.*lastName.*email/i);
  });

  test(
    'ADM-12-06: Import with no file chosen shows a message and imports nothing',
    { tag: ['@negative'] },
    async ({ admin }) => {
      await admin.openTeachers();
      const before = await admin.recordsFound();
      await admin.importTeacherButton.click();
      const importBtn = admin.modal.getByRole('button', { name: /^\s*Import\s*$/ });
      if (await importBtn.isEnabled()) {
        await importBtn.click();
        expect(await admin.toastText(), 'a message says a file is needed').toMatch(/file|select|choose/i);
      } else {
        // Import cannot be pressed without a file: nothing can be imported.
        await expect(importBtn).toBeDisabled();
      }
      await admin.closeAllModals();
      await admin.openTeachers();
      expect(await admin.recordsFound()).toBe(before);
    }
  );
});

/** All Classes: [{ section, grade, divisions }]. */
async function allClasses(admin) {
  await admin.openAcademicDetails();
  return admin.page.locator('tc-sc-web-section > div').evaluateAll((sections) =>
    sections.flatMap((s) => {
      const section = s.querySelector('h4')?.innerText.trim() || '';
      return [...s.querySelectorAll('.all-classes-list__grade')].map((g) => ({
        section,
        grade: g.innerText.trim(),
        divisions: [...g.parentElement.querySelectorAll('mat-card')].map((c) => c.innerText.trim()),
      }));
    })
  );
}

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

/** Subject cards of the open class page: [{ subject, book, teacher, students }]. */
const classSubjects = (admin) =>
  admin.page.locator('.teacher-allocation__info__subjects-list__card').evaluateAll((cards) =>
    cards.map((c) => {
      const cells = [...c.children].map((e) => e.innerText.trim());
      return { subject: cells[0], book: cells[1], teacher: cells[2], students: cells[3] };
    })
  );

test.describe('ADM-13 Class structure and class details', () => {
  test.skip(!AdminPage.configured, 'set ADMIN_* in .env');

  test(
    'ADM-13-01: All Classes shows the class structure for the current academic year',
    { tag: ['@smoke', '@functional'] },
    async ({ admin }) => {
      await admin.openAcademicDetails();
      const heading = await admin.page.getByText(/Class Structure for Academic Year/).innerText();
      const m = heading.match(/Academic Year (\w{3}) (\d{2}) - (\w{3}) (\d{2})/);
      expect(m, `heading "${heading}"`).not.toBeNull();
      const yy = new Date().getFullYear() % 100;
      expect([Number(m[2]), Number(m[4])], 'the current year is in the academic year').toContain(yy);
      expect((await allClasses(admin)).length).toBeGreaterThan(0);
    }
  );

  test(
    'ADM-13-02: every grade in School Grades appears in All Classes',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openSchoolSettings('School Grades');
      const grades = (await admin.allPagesRows()).map((r) => r[0]);
      await admin.closeAllModals();
      const listed = (await allClasses(admin)).map((c) => c.grade);
      expect(
        grades.filter((g) => !listed.includes(g)),
        'grades missing from All Classes (Admin F-13)'
      ).toEqual([]);
    }
  );

  test(
    'ADM-13-03: grades are grouped under their section (Pre-primary, Primary, Secondary, Higher Secondary), none under "Unknown"',
    { tag: ['@functional'] },
    async ({ admin }) => {
      const classes = await allClasses(admin);
      const unknown = classes.filter((c) => !/^(Pre-primary|Primary|Secondary|Higher Secondary)$/i.test(c.section));
      expect(
        unknown.map((c) => `${c.grade} under "${c.section}"`),
        'Admin F-14'
      ).toEqual([]);
    }
  );

  test(
    'ADM-13-04: opening Class 10 – Division A shows its subjects with book and teacher',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await openClass(admin, 'Class 10', 'Division A');
      const subjects = await classSubjects(admin);
      expect(subjects.length).toBeGreaterThan(0);
      for (const s of subjects) {
        expect(s.book, `${s.subject}: book`).toMatch(/\S/);
        expect(s.teacher, `${s.subject}: teacher`).toMatch(/\S/);
      }
    }
  );

  test(
    'ADM-13-05: Class 10 – Division A lists the same subjects raj.shinde sees for 10A in Teach Mode',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await openClass(admin, 'Class 10', 'Division A');
      const subjects = (await classSubjects(admin)).map((s) => s.subject);
      expect(subjects.sort(), 'Admin F-10').toEqual([...TEACH_10A_SUBJECTS].sort());
    }
  );

  test(
    'ADM-13-06: the Teachers count of Class 10 – Division A matches the teachers listed',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await openClass(admin, 'Class 10', 'Division A');
      const teachersInSubjects = new Set((await classSubjects(admin)).map((s) => s.teacher).filter(Boolean));
      const tab = admin.page.locator('.teacher-allocation__tabs li').filter({ hasText: 'Teachers' });
      const count = Number(((await tab.innerText()).match(/\d+/) || [NaN])[0]);
      await tab.click();
      await admin.page.waitForTimeout(1500);
      const panel = await admin.page.locator('.teacher-allocation__info').innerText();
      const listed = [...teachersInSubjects].filter((t) => panel.includes(t));
      expect(count, `Teachers tab count vs teachers ${[...teachersInSubjects].join(', ')}`).toBe(
        teachersInSubjects.size
      );
      expect(listed.length, 'every allocated teacher is listed on the Teachers tab').toBe(count);
    }
  );

  test(
    'ADM-13-07: the class page shows the number of students in 10A (30)',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await openClass(admin, 'Class 10', 'Division A');
      const text = (await admin.page.locator('tce-class-details').innerText()).replace(/\s+/g, ' ');
      const m = text.match(/Students?\s*:?\s*(\d+)|(\d+)\s*Students?/i);
      expect(m, 'a student count is shown (Admin F-11)').not.toBeNull();
      expect(Number(m[1] || m[2])).toBe(TEACH_10A_STUDENTS);
    }
  );

  test('ADM-13-08: the back arrow returns to All Classes', { tag: ['@functional'] }, async ({ admin }) => {
    await openClass(admin, 'Class 10', 'Division A');
    await admin.page.locator('tce-class-details .sub-top button').first().click();
    await expect(admin.page.getByText(/Class Structure for Academic Year/)).toBeVisible({ timeout: 15000 });
  });

  test(
    'ADM-13-09: Master Structure opens and shows the structure of the school',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openAcademicDetails();
      await admin.page.locator('.mat-tab-label').filter({ hasText: 'Master Structure' }).click();
      await admin.page.waitForTimeout(2500);
      const body = admin.page.locator('mat-tab-body.mat-tab-body-active');
      await expect(admin.page.locator('.mat-tab-label-active')).toContainText('Master Structure');
      const text = (await body.innerText()).replace(/\s+/g, ' ');
      expect(text, 'the Master Structure tab shows grades').toMatch(/Class \d+/);
    }
  );
});
