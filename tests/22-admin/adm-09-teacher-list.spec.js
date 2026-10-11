// ADM-09 — Teacher list, search and filter (Admin panel, read-only)
// Source: CEPV2_Stories/22_Admin.md
//
// The list grows by one AutoQA teacher per core run, so counts are checked against "Records Found" and the role
// filters rather than a fixed number.
const { test, expect, AdminPage, exportDateToIso, isoDate } = require('./admin-helpers');

const PRINCIPALS = ['satyajit.p', 'sushant.mokal', 'namita.shetty'];
const usernames = (rows) => rows.map((r) => r[1]);

test.describe('ADM-09 Teacher list, search and filter', () => {
  test.skip(!AdminPage.configured, 'set ADMIN_* in .env');

  test(
    'ADM-09-01: Teacher’s List shows every user (13) with full name, username, teacher status and login status',
    { tag: ['@smoke', '@functional'] },
    async ({ admin }) => {
      await admin.openTeachers();
      const rows = await admin.teacherRows();
      expect(rows.length).toBeGreaterThanOrEqual(13);
      for (const [name, user, status, login] of rows) {
        expect(name, 'full name').toMatch(/\S/);
        expect(user, `${name}: username`).toMatch(/^\S+$/);
        expect(status, `${name}: teacher status`).toMatch(/^[A-Z ]+$/);
        expect(login, `${name}: login status`).toMatch(/^[A-Z ]+$/);
      }
      for (const u of ['raj.shinde', ...PRINCIPALS]) expect(usernames(rows)).toContain(u);
    }
  );

  test('ADM-09-02: "Records Found" equals the number of rows listed', { tag: ['@functional'] }, async ({ admin }) => {
    await admin.openTeachers();
    expect(await admin.recordsFound()).toBe((await admin.teacherRows()).length);
  });

  test(
    'ADM-09-03: typing part of a first name (e.g. "raj") lists only matching users (Raj Shinde, Raj test)',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openTeachers();
      await admin.searchTeachers('raj');
      const rows = await admin.teacherRows();
      for (const r of rows) expect(r.join(' '), 'every row matches "raj"').toMatch(/raj/i);
      expect(usernames(rows).sort()).toEqual(['raj.shinde', 'raj.test']);
    }
  );

  test(
    'ADM-09-04: typing part of a last name (e.g. "Shinde") lists only Raj Shinde',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openTeachers();
      await admin.searchTeachers('Shinde');
      expect(usernames(await admin.teacherRows())).toEqual(['raj.shinde']);
    }
  );

  test('ADM-09-05: search ignores upper and lower case', { tag: ['@functional'] }, async ({ admin }) => {
    await admin.openTeachers();
    await admin.searchTeachers('raj');
    const lower = usernames(await admin.teacherRows()).sort();
    await admin.searchTeachers('RAJ');
    const upper = usernames(await admin.teacherRows()).sort();
    expect(lower.length).toBeGreaterThan(0);
    expect(upper).toEqual(lower);
  });

  test(
    'ADM-09-06: a search with no match shows an empty list and "Records Found: 0"',
    { tag: ['@negative'] },
    async ({ admin }) => {
      await admin.openTeachers();
      await admin.searchTeachers('zzqq');
      expect(await admin.teacherRows(), 'no rows for "zzqq" (Admin F-01)').toEqual([]);
      expect(await admin.recordsFound()).toBe(0);
    }
  );

  test(
    'ADM-09-07: a search after a previous search shows only the new results, not the previous ones',
    { tag: ['@negative'] },
    async ({ admin }) => {
      await admin.openTeachers();
      await admin.searchTeachers('sonam');
      expect(usernames(await admin.teacherRows())).toContain('sonam.p');
      await admin.searchTeachers('zzqq');
      expect(usernames(await admin.teacherRows()), 'the previous "sonam" results are gone (Admin F-01)').toEqual([]);
    }
  );

  test(
    'ADM-09-08: pasting a name into Search filters the list like typing it',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openTeachers();
      const all = (await admin.teacherRows()).length;
      // A paste puts the whole text in at once, without key presses.
      await admin.searchBox.click();
      await admin.page.evaluate(() => {
        const box = [...document.querySelectorAll('#input-search-field')].find((e) => e.offsetParent);
        const data = new DataTransfer();
        data.setData('text/plain', 'Shinde');
        box.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }));
      });
      await admin.searchBox.fill('Shinde');
      await admin.page.waitForTimeout(2500);
      const rows = await admin.teacherRows();
      expect(rows.length, `pasted "Shinde": ${rows.length} of ${all} rows listed (Admin F-04)`).toBe(1);
      expect(usernames(rows)).toEqual(['raj.shinde']);
    }
  );

  test('ADM-09-09: clearing Search shows all users again', { tag: ['@functional'] }, async ({ admin }) => {
    await admin.openTeachers();
    const all = usernames(await admin.teacherRows()).sort();
    await admin.searchTeachers('Shinde');
    await admin.searchBox.press('Control+A');
    await admin.searchBox.press('Backspace');
    await admin.page.waitForTimeout(2500);
    expect(usernames(await admin.teacherRows()).sort()).toEqual(all);
  });

  test(
    'ADM-09-10: filter Principal shows only principals (satyajit.p, sushant.mokal, namita.shetty)',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openTeachers();
      await admin.filterTeachers('Principal');
      expect(usernames(await admin.teacherRows()).sort()).toEqual([...PRINCIPALS].sort());
    }
  );

  test('ADM-09-11: filter Teacher shows only teachers (10)', { tag: ['@functional'] }, async ({ admin }) => {
    await admin.openTeachers();
    const all = usernames(await admin.teacherRows());
    await admin.filterTeachers('Teacher');
    const teachers = usernames(await admin.teacherRows());
    expect(
      teachers.filter((u) => PRINCIPALS.includes(u)),
      'principals in the Teacher filter'
    ).toEqual([]);
    expect(teachers.sort()).toEqual(all.filter((u) => !PRINCIPALS.includes(u)).sort());
  });

  test(
    'ADM-09-12: filter Supervisor with no supervisors shows an empty list',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openTeachers();
      await admin.filterTeachers('Supervisor');
      expect(await admin.teacherRows()).toEqual([]);
    }
  );

  test('ADM-09-13: filter InActive shows only inactive users', { tag: ['@functional'] }, async ({ admin }) => {
    await admin.openTeachers();
    await admin.filterTeachers('InActive');
    for (const [name, , status] of await admin.teacherRows())
      expect(status, `${name} listed under InActive`).not.toBe('ACTIVE');
  });

  test(
    'ADM-09-14: a user whose expiry date has passed is not shown as ACTIVE',
    { tag: ['@functional'] },
    async ({ admin }) => {
      const file = await admin.exportTeachers(test.info().outputDir);
      const today = isoDate(new Date());
      const expired = AdminPage.parseCsv(file.text).filter((u) => (exportDateToIso(u.Expiry) || '9999') < today);
      if (!expired.length) throw new Error('DATA MISSING ON THIS SERVER: no user with an expiry date in the past');
      await admin.closeAllModals();
      await admin.openTeachers();
      const rows = await admin.teacherRows();
      const shownActive = expired
        .filter((u) => rows.find((r) => r[1] === u.UserName)?.[2] === 'ACTIVE')
        .map((u) => `${u.UserName} (expired ${u.Expiry})`);
      expect(shownActive, 'expired users shown as ACTIVE (Admin F-05)').toEqual([]);
    }
  );

  test(
    'ADM-09-15: the row menu offers Edit, Reset Password, Reset PIN and Version History',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openTeachers();
      const items = await admin.teacherMenu('raj.shinde');
      expect((await items.allInnerTexts()).map((t) => t.trim())).toEqual([
        'Edit',
        'Reset Password',
        'Reset PIN',
        'Version History',
      ]);
      await admin.page.keyboard.press('Escape');
      await admin.page.mouse.click(5, 500);
    }
  );
});
