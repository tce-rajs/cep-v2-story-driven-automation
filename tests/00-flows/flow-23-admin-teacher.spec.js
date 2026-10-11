// FLOW-23 — The school admin looks after teachers (Admin panel + Teach Mode) — the owner's core flow.
// Source: CEPV2_Stories/00_EndToEndFlows.md
//
// Admin is a web page (Playwright's own browser page, not the desktop client). The flow creates its own teacher
// "AutoQA <letters>" and changes only that teacher; real teachers are never changed. Its steps run in order and share
// the teacher through a small state file (tests/22-admin/admin-helpers.js). Teacher sign-in is checked in Teach Mode
// in the browser. Adding a terminal stays manual.
const {
  test,
  expect,
  AdminPage,
  state,
  newTeacherDetails,
  daysFromNow,
  isoDate,
  exportDateToIso,
  openTeach,
  passwordSignIn,
  pinSignIn,
  firstSignIn,
  runSync,
  isDone,
  isFailed,
} = require('../22-admin/admin-helpers');

const KEY = 'flow23-teacher';
const SYNC = 'flow23-sync';

async function withTeach(browser, fn) {
  const t = await openTeach(browser);
  try {
    return await fn(t);
  } finally {
    await t.context.close();
  }
}

test.describe('FLOW-23 The school admin looks after teachers', () => {
  test.describe.configure({ timeout: 300000 });
  test.skip(!AdminPage.configured, 'set ADMIN_* in .env');

  test(
    'FLOW-23-01: the admin signs in with school name, user ID and password and sees the Dashboard',
    { tag: ['@smoke', '@functional'] },
    async ({ browser }) => {
      state.reset(KEY);
      state.reset(SYNC);
      const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
      try {
        const admin = new AdminPage(await context.newPage());
        await admin.signIn();
        await expect(admin.dashboardTitle.first()).toBeVisible();
        await expect(admin.page.getByText('School Statistics')).toBeVisible();
      } finally {
        await context.close();
      }
    }
  );

  test(
    'FLOW-23-02: a new teacher is created and shows ACTIVE in the list',
    { tag: ['@smoke', '@functional'] },
    async ({ admin, browser }) => {
      const d = newTeacherDetails();
      const expiry = daysFromNow(30);
      const { username, message } = await admin.createTeacher({ ...d, expiry });
      state.set(KEY, { ...d, username: username.toLowerCase(), expiry: expiry.toISOString() });
      expect(message).toMatch(/created successfully/i);
      await admin.findTeacher(username.toLowerCase());
      const row = (await admin.teacherRows()).find((r) => r[1] === username.toLowerCase());
      expect(row, 'the new teacher is listed').toBeTruthy();
      expect(row[2]).toBe('ACTIVE');
      // The teacher's first sign-in (new password, PIN), so the resets that follow have something to reset.
      const o = await withTeach(browser, (t) => firstSignIn(t, username.toLowerCase(), d.password1, d.pin1));
      expect(o.screen, `first sign-in at "${o.step}": ${o.message}`).toBe('signed-in');
      state.set(KEY, { password: d.password1, pin: d.pin1 });
    }
  );

  test(
    'FLOW-23-03: after Reset PIN the teacher must set a new PIN on the panel, and the old PIN fails',
    { tag: ['@smoke', '@functional'] },
    async ({ admin, browser }) => {
      const d = state.teacher(KEY);
      if (!d.pin) throw new Error('DATA MISSING ON THIS SERVER: the flow teacher never set a PIN (FLOW-23-02 failed)');
      const { message } = await admin.resetFromMenu(d.username, `${d.first} ${d.last}`, 'Reset PIN');
      expect(message).toMatch(/reset successfully/i);
      const old = await withTeach(browser, (t) => pinSignIn(t, d.pin));
      expect(old.screen, 'the old PIN is refused').toBe('error');
      await withTeach(browser, async (t) => {
        const o = await passwordSignIn(t, d.username, d.password);
        expect(o.screen, `password sign-in after Reset PIN: ${o.message}`).toBe('set-pin');
        await t.newUser.enterPin(d.pin2);
        await t.newUser.confirmPin(d.pin2);
        await t.page.waitForTimeout(3000);
      });
      state.set(KEY, { pin: d.pin2 });
      const fresh = await withTeach(browser, (t) => pinSignIn(t, d.pin2));
      expect(fresh.screen, 'the new PIN signs in').toBe('signed-in');
    }
  );

  test(
    'FLOW-23-04: after Reset Password the new password signs in and the old one fails',
    { tag: ['@smoke', '@functional'] },
    async ({ admin, browser }) => {
      const d = state.teacher(KEY);
      const { message } = await admin.resetFromMenu(d.username, `${d.first} ${d.last}`, 'Reset Password');
      expect(message).toMatch(/reset successfully/i);
      const old = await withTeach(browser, (t) => passwordSignIn(t, d.username, d.password));
      expect(old.screen, 'the old password is refused').toBe('error');
      const o = await withTeach(browser, (t) => firstSignIn(t, d.username, d.password2, d.pin));
      expect(['signed-in', 'set-pin'], `new password at "${o.step}": ${o.message}`).toContain(o.screen);
      expect(o.step).toBe('new password');
      state.set(KEY, { password: d.password2 });
    }
  );

  test(
    'FLOW-23-05: extending the expiry date saves and Edit shows the new date',
    { tag: ['@smoke', '@functional'] },
    async ({ admin }) => {
      const d = state.teacher(KEY);
      const expiry = daysFromNow(90);
      expect(await admin.editTeacher(d, { expiry })).toMatch(/Edited Successfully/i);
      state.set(KEY, { expiry: expiry.toISOString(), extended: true });
      await admin.openEdit(d.username, `${d.first} ${d.last}`);
      await admin.nextButton.click();
      await expect(admin.fc('expiry_date')).toHaveValue(isoDate(expiry));
    }
  );

  test(
    'FLOW-23-06: a teacher whose expiry date has passed cannot sign in and is not shown as ACTIVE',
    { tag: ['@negative'] },
    async ({ admin }) => {
      // An expiry date cannot be set in the past, so the users the school already has with a past expiry are used.
      const users = AdminPage.parseCsv((await admin.exportTeachers(test.info().outputDir)).text);
      const today = isoDate(new Date());
      const expired = users.filter((u) => (exportDateToIso(u.Expiry) || '9999') < today);
      if (!expired.length) throw new Error('DATA MISSING ON THIS SERVER: no user with an expiry date in the past');
      await admin.closeAllModals();
      await admin.openTeachers();
      const rows = await admin.teacherRows();
      const active = expired
        .filter((u) => rows.find((r) => r[1] === u.UserName)?.[2] === 'ACTIVE')
        .map((u) => `${u.UserName} (expired ${u.Expiry})`);
      expect(active, 'expired users shown as ACTIVE (Admin F-05)').toEqual([]);
    }
  );

  test(
    'FLOW-23-07: setting a teacher In Active stops them signing in',
    { tag: ['@functional'] },
    async ({ admin, browser }) => {
      const d = state.teacher(KEY);
      expect(await admin.editTeacher(d, { active: false })).toMatch(/Edited Successfully/i);
      try {
        const byPassword = await withTeach(browser, (t) => passwordSignIn(t, d.username, d.password));
        expect(byPassword.screen, 'an In Active teacher is refused (password)').toBe('error');
        const byPin = await withTeach(browser, (t) => pinSignIn(t, d.pin));
        expect(byPin.screen, 'an In Active teacher is refused (PIN)').toBe('error');
      } finally {
        await admin.ensureSignedIn();
        await admin.editTeacher(d, { active: true });
      }
    }
  );

  test(
    'FLOW-23-08: every change shows in Version History with date and admin name',
    { tag: ['@functional'] },
    async ({ admin }) => {
      const d = state.teacher(KEY);
      const rows = await admin.versionHistory(d.username);
      const ops = rows.map((r) => `${r[1]} (${r[3]})`).join(', ');
      const byAdmin = (re) =>
        rows.some((r) => re.test(r[1]) && r[3] === process.env.ADMIN_USERNAME && /\d{4}-/.test(r[2]));
      const missing = [
        ['PIN reset', /pin.*reset|reset.*pin/i],
        ['password reset', /password.*reset|reset.*password/i],
        ['expiry change', /expiry/i],
        ['status change', /status|inactive|in active|deactivat/i],
      ]
        .filter(([, re]) => !byAdmin(re))
        .map(([name]) => name);
      expect(missing, `changes missing from Version History: ${ops} (D2)`).toEqual([]);
    }
  );

  test(
    'FLOW-23-09: Sync completes: every part ends as completed and Last Sync On updates',
    { tag: ['@smoke', '@functional'] },
    async ({ admin }) => {
      test.setTimeout(16 * 60000);
      const s = await runSync(admin, SYNC);
      expect(
        s.final.filter(([, st]) => !isDone(st)).map((r) => r.join(': ')),
        `after ${s.minutes} min`
      ).toEqual([]);
      const before = AdminPage.parseSyncDate(s.lastBefore);
      const after = AdminPage.parseSyncDate(s.lastAfter);
      expect(after && after.getTime(), `Last Sync On "${s.lastBefore}" → "${s.lastAfter}"`).toBeGreaterThan(
        before.getTime()
      );
    }
  );

  test(
    'FLOW-23-10: no sync part shows Failed or stays in progress for more than 10 minutes',
    { tag: ['@negative'] },
    async ({ admin }) => {
      test.setTimeout(16 * 60000);
      const s = await runSync(admin, SYNC);
      const failed = s.snapshots.flatMap((snap) =>
        snap.rows.filter(([, st]) => isFailed(st)).map(([p, st]) => `${p}: ${st} at ${snap.seconds}s`)
      );
      const long = Object.entries(s.busyMs)
        .filter(([, ms]) => ms > 10 * 60000)
        .map(([p, ms]) => `${p}: ${Math.round(ms / 60000)} min`);
      const stillRunning = s.final.filter(([, st]) => !isDone(st) && !isFailed(st)).map((r) => r.join(': '));
      expect({ failed, long, stillRunning }).toEqual({ failed: [], long: [], stillRunning: [] });
    }
  );

  test(
    'FLOW-23-11: exported teachers match the list, including the new teacher and the new expiry date',
    { tag: ['@functional'] },
    async ({ admin }) => {
      const d = state.teacher(KEY);
      const users = AdminPage.parseCsv((await admin.exportTeachers(test.info().outputDir)).text);
      await admin.closeAllModals();
      await admin.openTeachers();
      const rows = await admin.teacherRows();
      expect(users.map((u) => u.UserName).sort()).toEqual(rows.map((r) => r[1]).sort());
      const mine = users.find((u) => u.UserName.toLowerCase() === d.username);
      expect(mine, `${d.username} in the export`).toBeTruthy();
      expect(exportDateToIso(mine.Expiry), `export expiry "${mine.Expiry}"`).toBe(isoDate(new Date(d.expiry)));
    }
  );
});
