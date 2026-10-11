// ADM-04 School grades, ADM-05 Subjects per grade, ADM-06 Subject types, ADM-07 Terminals, ADM-08 Miscellaneous
// settings — the School Settings window (Admin panel, read-only).
// Source: CEPV2_Stories/22_Admin.md
//
// Nothing is saved: forms and dropdowns are opened and closed again. Adding/deleting grades, terminals and subjects,
// changing types or times and uploading a logo are not automated (they change the live school).
const { test, expect, AdminPage } = require('./admin-helpers');

const CLASS_10_SUBJECTS = [
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
const SUBJECT_TYPES = ['Core Subject', 'Language Subject', 'Optional Subject', 'Co-Curricular Subject'];

/** School Subjects tab: { grade: [subjects] }. */
async function gradeSubjects(admin) {
  await admin.openSchoolSettings('School Subjects');
  return admin.modal
    .locator('table tbody tr')
    .evaluateAll((trs) =>
      Object.fromEntries(
        trs.map((tr) => [
          tr.querySelector('td').innerText.trim(),
          [...tr.querySelectorAll('.ng-value-label')].map((e) => e.innerText.trim()),
        ])
      )
    );
}

/** Divisions per grade on Academic Details → All Classes: { grade: count }. */
async function academicDivisions(admin) {
  await admin.openAcademicDetails();
  return admin.page
    .locator('tc-sc-web-grade > div')
    .evaluateAll((rows) =>
      Object.fromEntries(
        rows
          .filter((r) => r.querySelector('.all-classes-list__grade'))
          .map((r) => [
            r.querySelector('.all-classes-list__grade').innerText.trim(),
            [...r.querySelectorAll('mat-card')].filter((c) => /Division/.test(c.innerText)).length,
          ])
      )
    );
}

async function terminalRows(admin) {
  return (await admin.tableRows(admin.modal)).filter((r) => r.length >= 4 && /\d+\.\d+\.\d+\.\d+/.test(r[2]));
}

test.describe('ADM-04 School grades', () => {
  test.skip(!AdminPage.configured, 'set ADMIN_* in .env');

  test(
    'ADM-04-01: School Grades lists all 16 grades across its pages, each once',
    { tag: ['@smoke', '@functional'] },
    async ({ admin }) => {
      await admin.openSchoolSettings('School Grades');
      const names = (await admin.allPagesRows()).map((r) => r[0]);
      expect(new Set(names).size, `grades listed: ${names.join(', ')}`).toBe(names.length);
      expect(names.length).toBe(16);
    }
  );

  test(
    'ADM-04-02: every grade row shows grade name, ClassEdge grade, category, number of divisions and order number',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openSchoolSettings('School Grades');
      const rows = await admin.allPagesRows();
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) {
        expect(r[0], 'grade name').toMatch(/\S/);
        expect(r[1], `${r[0]}: ClassEdge grade`).toMatch(/\S/);
        expect(r[2], `${r[0]}: category`).toMatch(/\S/);
        expect(r[3], `${r[0]}: divisions`).toMatch(/^\d+$/);
        expect(r[4], `${r[0]}: order`).toMatch(/^\d+$/);
      }
    }
  );

  test(
    'ADM-04-03: all 10 rows of a page are visible without a hidden inner scroll',
    { tag: ['@regression'] },
    async ({ admin }) => {
      await admin.openSchoolSettings('School Grades');
      const hidden = await admin.modal.locator('.admin-table-responsive').evaluate((box) => {
        const b = box.getBoundingClientRect();
        return [...box.querySelectorAll('tbody tr')]
          .filter((tr) => {
            const r = tr.getBoundingClientRect();
            return r.bottom > b.bottom + 1 || r.bottom > window.innerHeight;
          })
          .map((tr) => tr.querySelector('td').innerText.trim());
      });
      expect(hidden, 'grade rows hidden below the table area (Admin F-15)').toEqual([]);
    }
  );

  test(
    'ADM-04-04: grades are listed in school order (Nursery, Junior KG, Senior KG, Class 1 … Class 12)',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openSchoolSettings('School Grades');
      const names = (await admin.allPagesRows()).map((r) => r[0]);
      const expected = ['Nursery', 'Junior KG', 'Senior KG', ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];
      const listed = names.filter((n) => expected.includes(n));
      expect(listed, 'grades in the order listed (Admin F-14)').toEqual(expected);
    }
  );

  test(
    'ADM-04-05: the number of divisions of each grade matches the divisions shown in Academic Details',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openSchoolSettings('School Grades');
      const settings = Object.fromEntries((await admin.allPagesRows()).map((r) => [r[0], Number(r[3])]));
      await admin.closeAllModals();
      const academic = await academicDivisions(admin);
      const differ = Object.keys(settings)
        .filter((g) => settings[g] !== (academic[g] ?? 0))
        .map((g) => `${g}: settings ${settings[g]}, Academic Details ${academic[g] ?? 'missing'}`);
      expect(differ, 'grades whose divisions differ (Admin F-13)').toEqual([]);
    }
  );

  test(
    'ADM-04-06: Add New Grade opens a form, and closing it adds nothing',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openSchoolSettings('School Grades');
      const before = (await admin.allPagesRows()).map((r) => r[0]);
      const inputsBefore = await admin.page.locator('input:visible, select:visible').count();
      await admin.modal.getByRole('button', { name: /Add New Grade/ }).click();
      await admin.page.waitForTimeout(1500);
      const inputsAfter = await admin.page.locator('input:visible, select:visible').count();
      expect(inputsAfter, 'a form with fields opened').toBeGreaterThan(inputsBefore);
      await admin.closeAllModals();
      await admin.openSchoolSettings('School Grades');
      const after = (await admin.allPagesRows()).map((r) => r[0]);
      expect(after).toEqual(before);
    }
  );
});

test.describe('ADM-05 Subjects per grade', () => {
  test.skip(!AdminPage.configured, 'set ADMIN_* in .env');

  test(
    'ADM-05-01: School Subjects lists every grade with its subjects',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openSchoolSettings('School Grades');
      const grades = (await admin.allPagesRows()).map((r) => r[0]);
      await admin.closeAllModals();
      const bySubject = await gradeSubjects(admin);
      for (const g of grades) {
        expect(bySubject[g], `${g} is listed in School Subjects`).toBeTruthy();
        expect(bySubject[g].length, `${g} has subjects`).toBeGreaterThan(0);
      }
    }
  );

  test(
    'ADM-05-02: Class 10 lists the 13 subjects raj.shinde sees for 10A in Teach Mode',
    { tag: ['@functional'] },
    async ({ admin }) => {
      const bySubject = await gradeSubjects(admin);
      expect([...(bySubject['Class 10'] || [])].sort()).toEqual([...CLASS_10_SUBJECTS].sort());
    }
  );

  test(
    'ADM-05-03: the subject dropdown of a grade offers only subjects not already chosen',
    { tag: ['@functional'] },
    async ({ admin }) => {
      const chosen = (await gradeSubjects(admin))['Class 10'];
      const row = admin.modal
        .locator('table tbody tr')
        .filter({ hasText: /^\s*Class 10\b/ })
        .first();
      // Open the list only (choosing an option would save at once).
      await row.locator('.ng-arrow-wrapper').click();
      const panel = admin.page.locator('.ng-dropdown-panel');
      await panel.waitFor({ timeout: 5000 });
      const offered = (await panel.locator('.ng-option:not(.ng-option-selected)').allInnerTexts()).map((t) => t.trim());
      await admin.page.keyboard.press('Escape');
      expect(
        offered.filter((o) => chosen.includes(o)),
        'already-chosen subjects offered again'
      ).toEqual([]);
    }
  );
});

test.describe('ADM-06 Subject types', () => {
  test.skip(!AdminPage.configured, 'set ADMIN_* in .env');

  test(
    "ADM-06-01: Subject Settings lists all the school's subjects (35), not an empty table",
    { tag: ['@regression'] },
    async ({ admin }) => {
      const all = new Set(Object.values(await gradeSubjects(admin)).flat());
      await admin.settingsTab('Subject Settings');
      const listed = (await admin.tableRows(admin.modal)).map((r) => r[0]);
      expect(listed.length, 'Subject Settings is not empty (Admin F-02)').toBeGreaterThan(0);
      expect([...new Set(listed)].sort()).toEqual([...all].sort());
    }
  );

  test(
    'ADM-06-02: each subject shows its current type ("Not Assigned" when none is set)',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openSchoolSettings('Subject Settings');
      const rows = admin.modal.locator('table tbody tr');
      expect(await rows.count()).toBeGreaterThan(0);
      const types = await rows.evaluateAll((trs) =>
        trs.map((tr) => [
          tr.querySelector('td').innerText.trim(),
          tr.querySelector('.ng-value-label')?.innerText.trim(),
        ])
      );
      for (const [subject, type] of types)
        expect([...SUBJECT_TYPES, 'Not Assigned'], `${subject} shows a type`).toContain(type);
    }
  );

  test(
    'ADM-06-03: the type choices are Core Subject, Language Subject, Optional Subject and Co-Curricular Subject',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openSchoolSettings('Subject Settings');
      await admin.modal.locator('table tbody tr').first().locator('.ng-arrow-wrapper').click();
      const panel = admin.page.locator('.ng-dropdown-panel');
      await panel.waitFor({ timeout: 5000 });
      const options = (await panel.locator('.ng-option').allInnerTexts()).map((t) => t.trim());
      await admin.page.keyboard.press('Escape');
      expect(options.filter((o) => o !== 'Not Assigned').sort()).toEqual([...SUBJECT_TYPES].sort());
    }
  );
});

test.describe('ADM-07 Terminals', () => {
  test.skip(!AdminPage.configured, 'set ADMIN_* in .env');

  test(
    'ADM-07-01: Terminal Settings lists each terminal with type, IP and location',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openSchoolSettings('Terminal Settings');
      const rows = await terminalRows(admin);
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) {
        expect(r[1], 'type').toMatch(/^(classroom|teacher)$/i);
        expect(r[2], 'IP').toMatch(/^\d{1,3}(\.\d{1,3}){3}$/);
        expect(r[3], `${r[2]}: location`).toMatch(/\S/);
      }
    }
  );

  test(
    'ADM-07-02: paging shows all terminals (6) across the pages, each once',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openSchoolSettings('Terminal Settings');
      const ips = (await admin.allPagesRows())
        .filter((r) => r.length >= 4 && /\d+\.\d+\.\d+\.\d+/.test(r[2]))
        .map((r) => r[2]);
      expect(new Set(ips).size, `IPs: ${ips.join(', ')}`).toBe(ips.length);
      expect(ips.length).toBe(6);
    }
  );

  test(
    'ADM-07-03: the line "Total allotted classroom Terminal: 10 and Teacher Terminal: 1" matches View School',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openSchoolSettings('Terminal Settings');
      const line = (await admin.modal.locator('.terminalInfoDisplay').innerText()).replace(/\s+/g, ' ');
      const m = line.match(/classroom Terminal:\s*(\d+) and Teacher Terminal:\s*(\d+)/i);
      expect(m, `allotment line "${line}"`).not.toBeNull();
      await admin.closeAllModals();
      const school = await admin.viewSchoolText();
      const c = school.match(/classroom[^:]*terminal[^:]*:\s*(\d+)/i);
      const t = school.match(/teacher[^:]*terminal[^:]*:\s*(\d+)/i);
      expect(c && t, 'View School shows the classroom and teacher terminal allowance').toBeTruthy();
      expect([Number(c[1]), Number(t[1])]).toEqual([Number(m[1]), Number(m[2])]);
    }
  );

  /** The search field of Terminal Settings (shown by the search icon). */
  async function searchTerminals(admin, text) {
    const tab = admin.modal.locator('tce-settings-terminal-settings');
    let box = tab.locator('input[type="text"], input[type="search"], input:not([type])').filter({ visible: true });
    if (!(await box.count())) {
      await tab.locator('button.btn-icon').click();
      await admin.page.waitForTimeout(800);
      box = tab.locator('input[type="text"], input[type="search"], input:not([type])').filter({ visible: true });
    }
    await expect(box.first(), 'Terminal Settings has a search field').toBeVisible();
    await box.first().pressSequentially(text, { delay: 40 });
    await admin.page.keyboard.press('Enter');
    await admin.page.waitForTimeout(2000);
  }

  test(
    'ADM-07-04: searching by an existing terminal IP shows only that terminal',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openSchoolSettings('Terminal Settings');
      const ip = (await terminalRows(admin))[0][2];
      await searchTerminals(admin, ip);
      const ips = (await terminalRows(admin)).map((r) => r[2]);
      expect(ips).toEqual([ip]);
    }
  );

  test(
    'ADM-07-05: searching for an IP that is not registered shows an empty list',
    { tag: ['@negative'] },
    async ({ admin }) => {
      await admin.openSchoolSettings('Terminal Settings');
      await searchTerminals(admin, '10.254.254.254');
      expect(await terminalRows(admin)).toEqual([]);
    }
  );

  test(
    'ADM-07-06: the download button saves a file listing the same terminals as the screen',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openSchoolSettings('Terminal Settings');
      const ips = (await admin.allPagesRows())
        .filter((r) => r.length >= 4 && /\d+\.\d+\.\d+\.\d+/.test(r[2]))
        .map((r) => r[2]);
      const file = await admin.download(
        () => admin.modal.locator('button:has(.fa-download)').click(),
        test.info().outputDir
      );
      const fs = require('fs');
      const content = file.text || fs.readFileSync(file.path).toString('latin1');
      for (const ip of ips) expect(content, `downloaded file lists ${ip}`).toContain(ip);
    }
  );

  test(
    "ADM-07-07: the location info icon shows the terminal's details",
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openSchoolSettings('Terminal Settings');
      const first = (await terminalRows(admin))[0];
      await admin.modal.locator('.fa-info-circle').first().click();
      const details = admin.modal.locator('.collapse.show');
      await expect(details).toBeVisible();
      const text = (await details.innerText()).trim();
      // Details of the terminal: at least its IP, location or another real value — not a placeholder.
      expect(text, `details shown: "${text}"`).not.toMatch(/^(extra)?$/i);
      expect(text.length).toBeGreaterThan(first[3].length);
    }
  );
});

test.describe('ADM-08 School days, timing, attendance cut-off and logo', () => {
  test.skip(!AdminPage.configured, 'set ADMIN_* in .env');

  test(
    'ADM-08-01: Miscellaneous Settings shows the saved school days, start time, end time and period duration',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openSchoolSettings('Miscellaneous Settings');
      const tab = admin.modal.locator('form').filter({ hasText: 'School Days' }).first();
      const days = await tab.locator('[formgroupname="weekOfdays"] input:checked').count();
      const time = async (name) =>
        (await tab.locator(`[formcontrolname="${name}"] input`).evaluateAll((i) => i.map((e) => e.value))).join(':');
      const start = await time('startTime');
      const end = await time('endTime');
      const period = await time('periodDuration');
      expect(days, 'at least one school day is ticked (Admin F-21)').toBeGreaterThan(0);
      expect(start, 'start time set').not.toMatch(/^(0*:?)*$/);
      expect(end, 'end time set').not.toMatch(/^(0*:?)*$/);
      expect(period, 'period duration set').not.toMatch(/^(0*:?)*$/);
    }
  );

  test(
    'ADM-08-02: the attendance cut-off list offers values 1 to 10 and says what unit they are in',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openSchoolSettings('Miscellaneous Settings');
      const values = (await admin.modal.locator('#attendance option').allInnerTexts()).map((t) => t.trim());
      expect(values).toEqual(Array.from({ length: 10 }, (_, i) => String(i + 1)));
      const label = await admin.modal.locator('#attendance').locator('xpath=..').innerText();
      expect(label, 'the cut-off says its unit (minutes, hours, periods, days)').toMatch(
        /minute|hour|period|day|mins|hrs/i
      );
    }
  );
});
