// ADM-11 — Edit a teacher, reset password/PIN, history (Admin panel) — the owner's core flow.
// Source: CEPV2_Stories/22_Admin.md
//
// Every change is made on the AutoQA teacher ADM-10 created in this run (read from the shared state file); ADM-11-02
// only opens raj.shinde's Edit window to read it and closes it without saving. The order of the tests is deliberate:
// edits and expiry first, then the password reset, then the PIN reset, then In Active (set back to Active at the end).
// Teacher sign-in is checked in Teach Mode in the browser.
const {
  test,
  expect,
  AdminPage,
  state,
  daysFromNow,
  isoDate,
  exportDateToIso,
  openTeach,
  passwordSignIn,
  pinSignIn,
  firstSignIn,
} = require('./admin-helpers');

const KEY = 'adm-teacher';

/** Open Edit on the AutoQA teacher, apply step-1 `details` and step-2 `expiry` / `active`, then Submit. */
async function editTeacher(admin, d, { details = {}, expiry, active } = {}) {
  await admin.openEdit(d.username, `${d.first} ${d.last}`);
  if (Object.keys(details).length) await admin.fillUserDetails(details);
  await admin.dismissKeyboard();
  await admin.nextButton.click();
  await admin.fc('username').waitFor({ timeout: 10000 });
  if (active !== undefined) await admin.setLoginDetails({ active });
  if (expiry) await admin.pickExpiryDate(expiry);
  await admin.dismissKeyboard();
  await admin.submitButton.click();
  const message = await admin.toastText();
  await admin.closeAllModals();
  return message;
}

async function withTeach(browser, fn) {
  const t = await openTeach(browser);
  try {
    return await fn(t);
  } finally {
    await t.context.close();
  }
}

test.describe('ADM-11 Edit a teacher, reset password/PIN, history', () => {
  test.describe.configure({ timeout: 240000 });
  test.skip(!AdminPage.configured, 'set ADMIN_* in .env');

  test(
    'ADM-11-01: Edit opens "Edit User: <title> <name>" with the saved name, email, contact number, user name, role and expiry date',
    { tag: ['@smoke', '@functional'] },
    async ({ admin }) => {
      const d = state.teacher(KEY);
      await admin.openEdit(d.username, `${d.first} ${d.last}`);
      await expect(admin.modal).toContainText(new RegExp(`Edit User:\\s*Mr\\.?\\s*${d.first}\\s+${d.last}`));
      await expect(admin.fc('first_name')).toHaveValue(d.first);
      await expect(admin.fc('last_name')).toHaveValue(d.last);
      await expect(admin.fc('email')).toHaveValue(d.email);
      await expect(admin.fc('contact')).toHaveValue(/9876543210$/);
      await admin.dismissKeyboard();
      await admin.nextButton.click();
      await expect(admin.fc('username')).toHaveValue(new RegExp(`^${d.username}$`, 'i'));
      await expect(admin.fc('roles')).toContainText('Teacher');
      await expect(admin.fc('expiry_date')).toHaveValue(isoDate(new Date(d.expiry)));
    }
  );

  test(
    'ADM-11-02: the Subjects field of a teacher shows no empty entries',
    { tag: ['@functional'] },
    async ({ admin }) => {
      // Read only: raj.shinde's Edit window is opened and closed without saving.
      await admin.openEdit('raj.shinde', 'Raj Shinde', { readOnly: true });
      const chips = (await admin.fc('subjects').locator('.ng-value-label').allInnerTexts()).map((t) => t.trim());
      await admin.closeAllModals();
      expect(chips.length).toBeGreaterThan(0);
      expect(
        chips.filter((c) => !c),
        `subjects: ${chips.join(' | ')} (Admin F-06)`
      ).toEqual([]);
    }
  );

  test(
    'ADM-11-03: closing Edit without saving leaves the teacher unchanged',
    { tag: ['@functional'] },
    async ({ admin }) => {
      const d = state.teacher(KEY);
      await admin.openEdit(d.username, `${d.first} ${d.last}`);
      await admin.fc('last_name').fill(`${d.last}Unsaved`);
      await admin.closeAllModals();
      await admin.openEdit(d.username, `${d.first} ${d.last}`);
      await expect(admin.fc('last_name')).toHaveValue(d.last);
      await admin.closeAllModals();
    }
  );

  test(
    "ADM-11-04: Version History lists the user's changes with version, operation, date and user",
    { tag: ['@functional'] },
    async ({ admin }) => {
      const d = state.teacher(KEY);
      const rows = await admin.versionHistory(d.username);
      expect(rows.length).toBeGreaterThan(0);
      for (const [version, operation, date, user] of rows) {
        expect(version, 'version').toMatch(/^\d+$/);
        expect(operation, `v${version}: operation`).toMatch(/\S/);
        expect(date, `v${version}: date`).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
        expect(user, `v${version}: user`).toMatch(/\S/);
      }
      expect(rows[0][1]).toMatch(/New/i);
    }
  );

  test("ADM-11-05: Version History's Close returns to the list", { tag: ['@functional'] }, async ({ admin }) => {
    const d = state.teacher(KEY);
    await admin.versionHistory(d.username);
    await admin.modal.locator('button.formBtn', { hasText: 'Close' }).click();
    await expect(admin.page.locator('ngb-modal-window')).toHaveCount(0);
    await expect(admin.page.getByText('Teacher’s List')).toBeVisible();
  });

  test(
    'ADM-11-13: extending a user’s expiry date saves and Edit shows the new date',
    { tag: ['@smoke', '@functional'] },
    async ({ admin }) => {
      const d = state.teacher(KEY);
      const expiry = daysFromNow(90);
      const message = await editTeacher(admin, d, { expiry });
      expect(message).toMatch(/Edited Successfully/i);
      state.set(KEY, { expiry: expiry.toISOString(), extended: true });
      await admin.openEdit(d.username, `${d.first} ${d.last}`);
      await admin.dismissKeyboard();
      await admin.nextButton.click();
      await expect(admin.fc('expiry_date')).toHaveValue(isoDate(expiry));
    }
  );

  test(
    'ADM-11-14: the exported teacher file shows the extended expiry date',
    { tag: ['@functional'] },
    async ({ admin }) => {
      const d = state.teacher(KEY);
      if (!d.extended) throw new Error('DATA MISSING ON THIS SERVER: the expiry was not extended (ADM-11-13 failed)');
      const file = await admin.exportTeachers(test.info().outputDir);
      const row = AdminPage.parseCsv(file.text).find((u) => u.UserName.toLowerCase() === d.username);
      expect(row, `${d.username} is in the export`).toBeTruthy();
      expect(exportDateToIso(row.Expiry), `export expiry "${row.Expiry}"`).toBe(isoDate(new Date(d.expiry)));
    }
  );

  test(
    'ADM-11-15: a user whose expiry was extended can still sign in to Teach Mode',
    { tag: ['@functional'] },
    async ({ browser }) => {
      const d = state.teacher(KEY);
      if (!d.extended || !d.pin) throw new Error('DATA MISSING ON THIS SERVER: no extended AutoQA teacher with a PIN');
      const o = await withTeach(browser, (t) => pinSignIn(t, d.pin));
      expect(o.screen, o.message).toBe('signed-in');
    }
  );

  test(
    'ADM-11-09: an edited name shows in Teach Mode after the teacher signs in again',
    { tag: ['@functional'] },
    async ({ admin, browser }) => {
      const d = state.teacher(KEY);
      if (!d.pin) throw new Error('DATA MISSING ON THIS SERVER: the AutoQA teacher has no PIN yet (ADM-10-14 failed)');
      const last = `${d.last}ed`;
      const message = await editTeacher(admin, d, { details: { last } });
      expect(message).toMatch(/Edited Successfully/i);
      state.set(KEY, { last });
      await withTeach(browser, async (t) => {
        const o = await pinSignIn(t, d.pin);
        expect(o.screen, o.message).toBe('signed-in');
        const body = await t.page.locator('body').innerText();
        let shown = body.includes(last);
        if (!shown && (await t.login.avatar.isVisible().catch(() => false))) {
          await t.login.avatar.click({ force: true });
          await t.page.waitForTimeout(1500);
          shown = (await t.page.locator('body').innerText()).includes(last);
        }
        expect(shown, `Teach Mode shows the new name "${d.first} ${last}"`).toBe(true);
      });
    }
  );

  test(
    'ADM-11-06: Reset Password asks for confirmation before resetting',
    { tag: ['@functional'] },
    async ({ admin }) => {
      const d = state.teacher(KEY);
      const { dialog, message } = await admin.resetFromMenu(d.username, `${d.first} ${d.last}`, 'Reset Password');
      expect(dialog).toMatch(/Are you sure/i);
      expect(message).toMatch(/reset successfully/i);
      state.set(KEY, { passwordReset: true });
    }
  );

  test(
    'ADM-11-11: after Reset Password the old password no longer signs in',
    { tag: ['@negative'] },
    async ({ browser }) => {
      const d = state.teacher(KEY);
      if (!d.passwordReset)
        throw new Error('DATA MISSING ON THIS SERVER: the password was not reset (ADM-11-06 failed)');
      const o = await withTeach(browser, (t) => passwordSignIn(t, d.username, d.password));
      expect(o.screen, 'the old password is refused').toBe('error');
      expect(o.message).toMatch(/invalid/i);
    }
  );

  test(
    'ADM-11-10: after Reset Password the teacher signs in with the new password',
    { tag: ['@functional'] },
    async ({ browser }) => {
      const d = state.teacher(KEY);
      if (!d.passwordReset)
        throw new Error('DATA MISSING ON THIS SERVER: the password was not reset (ADM-11-06 failed)');
      const o = await withTeach(browser, (t) => firstSignIn(t, d.username, d.password2, d.pin));
      expect(['signed-in', 'set-pin'], `at "${o.step}": ${o.message}`).toContain(o.screen);
      expect(o.step).toBe('new password');
      state.set(KEY, { password: d.password2 });
    }
  );

  test(
    'ADM-11-07: after Reset PIN the teacher is asked to set a new PIN on the panel',
    { tag: ['@functional'] },
    async ({ admin, browser }) => {
      const d = state.teacher(KEY);
      const { dialog, message } = await admin.resetFromMenu(d.username, `${d.first} ${d.last}`, 'Reset PIN');
      expect(dialog).toMatch(/Are you sure/i);
      expect(message).toMatch(/reset successfully/i);
      state.set(KEY, { oldPin: d.pin, pin: null });
      await withTeach(browser, async (t) => {
        const o = await passwordSignIn(t, d.username, d.password);
        expect(o.screen, `after Reset PIN, the password sign-in: ${o.message}`).toBe('set-pin');
        await t.newUser.enterPin(d.pin2);
        await t.newUser.confirmPin(d.pin2);
        await t.page.waitForTimeout(3000);
        state.set(KEY, { pin: d.pin2 });
      });
    }
  );

  test('ADM-11-12: after Reset PIN the old PIN no longer signs in', { tag: ['@negative'] }, async ({ browser }) => {
    const d = state.teacher(KEY);
    if (!d.oldPin) throw new Error('DATA MISSING ON THIS SERVER: the PIN was not reset (ADM-11-07 failed)');
    const o = await withTeach(browser, (t) => pinSignIn(t, d.oldPin));
    expect(o.screen, 'the old PIN is refused').toBe('error');
  });

  test('ADM-11-16: an expiry date in the past cannot be saved', { tag: ['@negative'] }, async ({ admin }) => {
    const d = state.teacher(KEY);
    await admin.openEdit(d.username, `${d.first} ${d.last}`);
    await admin.dismissKeyboard();
    await admin.nextButton.click();
    const dp = await admin.openExpiryCalendar();
    const yesterday = daysFromNow(-1);
    const years = (await dp.locator('select[title="Select year"] option').allInnerTexts()).map((y) => y.trim());
    let pickable = false;
    if (years.includes(String(yesterday.getFullYear()))) {
      await dp.locator('select[title="Select year"]').selectOption(String(yesterday.getFullYear()));
      const months = await dp.locator('select[title="Select month"] option').evaluateAll((o) => o.map((e) => e.value));
      if (months.includes(String(yesterday.getMonth() + 1))) {
        await dp.locator('select[title="Select month"]').selectOption(String(yesterday.getMonth() + 1));
        const cell = dp.locator(`[role="gridcell"][aria-label*="${AdminPage.dayLabel(yesterday)}"]`).first();
        if (await cell.count()) {
          const cls = `${await cell.getAttribute('class')} ${await cell.locator('div').first().getAttribute('class')}`;
          pickable = !/disabled/.test(cls) && (await cell.getAttribute('aria-disabled')) !== 'true';
        }
      }
    }
    await admin.closeAllModals();
    expect(pickable, `yesterday (${isoDate(yesterday)}) can be chosen as the expiry date`).toBe(false);
  });

  test(
    'ADM-11-17: Version History lists the reset and the expiry change with date and admin name',
    { tag: ['@functional'] },
    async ({ admin }) => {
      const d = state.teacher(KEY);
      const rows = await admin.versionHistory(d.username);
      const ops = rows.map((r) => `${r[1]} (${r[3]})`);
      const byAdmin = (re) =>
        rows.some((r) => re.test(r[1]) && r[3] === process.env.ADMIN_USERNAME && /\d{4}-/.test(r[2]));
      expect(byAdmin(/password.*reset|reset.*password/i), `password reset in: ${ops.join(', ')} (D2)`).toBe(true);
      expect(byAdmin(/pin.*reset|reset.*pin/i), `PIN reset in: ${ops.join(', ')} (D2)`).toBe(true);
      expect(byAdmin(/expiry/i), `expiry change in: ${ops.join(', ')} (D2)`).toBe(true);
    }
  );

  test(
    'ADM-11-08: setting a user In Active stops them signing in on the panel',
    { tag: ['@functional'] },
    async ({ admin, browser }) => {
      const d = state.teacher(KEY);
      const message = await editTeacher(admin, d, { active: false });
      expect(message).toMatch(/Edited Successfully/i);
      try {
        const o = await withTeach(browser, (t) => passwordSignIn(t, d.username, d.password));
        expect(o.screen, 'an In Active teacher is refused').toBe('error');
      } finally {
        // Back to Active, so later checks (ADM-14-09) can sign in.
        await admin.ensureSignedIn();
        await editTeacher(admin, state.teacher(KEY), { active: true });
      }
    }
  );
});
