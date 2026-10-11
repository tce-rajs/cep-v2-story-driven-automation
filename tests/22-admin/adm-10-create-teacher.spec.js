// ADM-10 — Create a teacher (Admin panel) — the owner's core flow.
// Source: CEPV2_Stories/22_Admin.md
//
// Every run creates its own teacher "AutoQA <letters>" (names refuse digits); real teachers are never changed. The
// teacher's details travel to the next tests (and to ADM-11 / ADM-14) through a small state file, because a failed
// test restarts the worker. The order of the tests in this file is deliberate: form checks, then create, then sign-in.
// Teacher sign-in is checked in Teach Mode in the browser (the desktop client's one profile is used by other runs).
const {
  test,
  expect,
  AdminPage,
  state,
  newTeacherDetails,
  daysFromNow,
  openTeach,
  passwordSignIn,
  firstSignIn,
  DEFAULT_PASSWORD,
} = require('./admin-helpers');

const KEY = 'adm-teacher';

/** Valid step-1 details of a throw-away (never submitted) form. */
const probe = () => ({
  title: 'Mr',
  first: 'AutoQA',
  last: 'Probe',
  email: 'autoqa.probe@example.com',
  contact: '9876543210',
});

test.describe('ADM-10 Create a teacher', () => {
  test.describe.configure({ timeout: 240000 });
  test.skip(!AdminPage.configured, 'set ADMIN_* in .env');

  test(
    'ADM-10-01: Create Teacher opens "Create User" on step 1 (User Details)',
    { tag: ['@smoke', '@functional'] },
    async ({ admin }) => {
      // First test of the run: forget the teacher of an earlier run.
      state.reset(KEY);
      await admin.openCreateTeacher();
      await expect(admin.modal.locator('h2')).toHaveText(/Create User/);
      await expect(admin.modal.locator('.step.active')).toHaveAttribute('data-target', '#user-details');
      await expect(admin.modal.getByText('User Details')).toBeVisible();
      await expect(admin.fc('first_name')).toBeVisible();
    }
  );

  test(
    'ADM-10-02: Next stays disabled while a mandatory field (title, first name, last name, email, contact number) is empty',
    { tag: ['@negative'] },
    async ({ admin }) => {
      const fields = { first: 'first_name', last: 'last_name', email: 'email', contact: 'contact' };
      await admin.openCreateTeacher();
      // Title left unchosen, everything else valid.
      await admin.fillUserDetails({ ...probe(), title: undefined });
      await expect(admin.nextButton, 'Next with no title').toBeDisabled();
      await admin.fillUserDetails(probe());
      await expect(admin.nextButton, 'Next with every field valid').toBeEnabled();
      for (const [key, control] of Object.entries(fields)) {
        await admin.fc(control).fill('');
        await admin.modal.locator('h3').filter({ visible: true }).first().click();
        await expect(admin.nextButton, `Next with an empty ${key}`).toBeDisabled();
        await admin.fillUserDetails({ [key]: probe()[key] });
      }
    }
  );

  test('ADM-10-03: an invalid email shows "Invalid Email ID."', { tag: ['@negative'] }, async ({ admin }) => {
    await admin.openCreateTeacher();
    await admin.fillUserDetails({ ...probe(), email: 'autoqa.probe@' });
    await expect(admin.modal.getByText('Invalid Email ID.')).toBeVisible();
    await expect(admin.nextButton).toBeDisabled();
  });

  test(
    'ADM-10-04: letters in the contact number show "Invalid mobile number."',
    { tag: ['@negative'] },
    async ({ admin }) => {
      await admin.openCreateTeacher();
      await admin.fillUserDetails({ ...probe(), contact: '98765abcde' });
      await expect(admin.modal.getByText('Invalid mobile number.')).toBeVisible();
      await expect(admin.nextButton).toBeDisabled();
    }
  );

  test(
    'ADM-10-05: valid details enable Next and open step 2 (User Login Details)',
    { tag: ['@smoke', '@functional'] },
    async ({ admin }) => {
      await admin.openCreateTeacher();
      await admin.fillUserDetails(probe());
      await expect(admin.nextButton).toBeEnabled();
      await admin.dismissKeyboard();
      await admin.nextButton.click();
      await expect(admin.modal.locator('.step.active')).toHaveAttribute('data-target', '#user-login-details');
      await expect(admin.fc('username')).toBeVisible();
      await expect(admin.fc('expiry_date')).toBeVisible();
    }
  );

  test(
    'ADM-10-06: step 2 suggests a user name built from first and last name',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openCreateTeacher();
      await admin.fillUserDetails(probe());
      await admin.dismissKeyboard();
      await admin.nextButton.click();
      await expect(admin.fc('username')).toHaveValue(/^autoqa\.probe$/i);
    }
  );

  test(
    'ADM-10-07: a user name with spaces, Hindi letters or emoji is refused with a message',
    { tag: ['@negative'] },
    async ({ admin }) => {
      await admin.openCreateTeacher();
      await admin.fillUserDetails(probe());
      await admin.dismissKeyboard();
      await admin.nextButton.click();
      await admin.setLoginDetails();
      await admin.pickExpiryDate(daysFromNow(30));
      for (const bad of ['auto qa', 'autoqa.राज', 'autoqa.😀']) {
        await admin.fc('username').fill(bad);
        await admin.fc('username').press('Tab');
        const refused =
          (await admin.submitButton.isDisabled()) ||
          (await admin.modal.locator('.text-danger, .invalid-feedback, .error').filter({ visible: true }).count()) > 0;
        // Never submitted: a refused name keeps Submit disabled or shows a message.
        expect(refused, `user name "${bad}" is accepted without a message (Admin F-07)`).toBe(true);
      }
    }
  );

  test(
    'ADM-10-08: a first name longer than the allowed length is refused',
    { tag: ['@negative'] },
    async ({ admin }) => {
      await admin.openCreateTeacher();
      await admin.fillUserDetails({ ...probe(), first: 'A'.repeat(300) });
      const value = await admin.fc('first_name').inputValue();
      const refused =
        value.length < 300 ||
        (await admin.nextButton.isDisabled()) ||
        (await admin.modal.locator('.text-danger, .invalid-feedback, .error').filter({ visible: true }).count()) > 0;
      expect(refused, 'a 300-letter first name is taken without a limit or message (Admin F-07)').toBe(true);
    }
  );

  test(
    'ADM-10-09: Previous returns to step 1 with the entered details kept',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openCreateTeacher();
      const d = probe();
      await admin.fillUserDetails(d);
      await admin.dismissKeyboard();
      await admin.nextButton.click();
      await admin.fc('username').waitFor();
      await admin.previousButton.click();
      await expect(admin.modal.locator('.step.active')).toHaveAttribute('data-target', '#user-details');
      await expect(admin.fc('first_name')).toHaveValue(d.first);
      await expect(admin.fc('last_name')).toHaveValue(d.last);
      await expect(admin.fc('email')).toHaveValue(d.email);
      await expect(admin.fc('contact')).toHaveValue(d.contact);
    }
  );

  test(
    'ADM-10-10: closing the window without Submit creates no user (Records Found unchanged)',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openTeachers();
      const before = await admin.recordsFound();
      await admin.createTeacherButton.click();
      await admin.fillUserDetails(probe());
      await admin.dismissKeyboard();
      await admin.nextButton.click();
      await admin.closeAllModals();
      await admin.openTeachers();
      expect(await admin.recordsFound()).toBe(before);
      await expect(admin.teacherRow('AutoQA Probe')).toHaveCount(0);
    }
  );

  test(
    'ADM-10-11: Submit without an expiry date is refused with a message',
    { tag: ['@negative'] },
    async ({ admin }) => {
      const d = newTeacherDetails();
      await admin.openTeachers();
      const before = await admin.recordsFound();
      await admin.createTeacherButton.click();
      await admin.fillUserDetails({
        title: 'Mr',
        first: d.first,
        last: `${d.last}n`,
        email: d.email,
        contact: '9876543210',
      });
      await admin.dismissKeyboard();
      await admin.nextButton.click();
      await admin.setLoginDetails();
      if (await admin.submitButton.isEnabled()) {
        // Only an AutoQA name: if the form lets it through, see what the server says.
        await admin.dismissKeyboard();
        await admin.submitButton.click();
        const message = [await admin.toastText(), ...(await admin.formMessages())].join(' | ');
        await admin.closeAllModals();
        await admin.openTeachers();
        expect(await admin.recordsFound(), `no user is created without an expiry date ("${message}")`).toBe(before);
        expect(message, 'a message explains the expiry date is needed').toMatch(/expiry|date/i);
      } else {
        await expect(admin.submitButton).toBeDisabled();
      }
    }
  );

  test(
    'ADM-10-13: a created teacher appears in the list and can sign in on the panel',
    { tag: ['@smoke', '@functional'] },
    async ({ admin, browser }) => {
      const d = newTeacherDetails();
      await admin.openTeachers();
      const before = await admin.recordsFound();
      const expiry = daysFromNow(30);
      const { username, message } = await admin.createTeacher({ ...d, expiry });
      state.set(KEY, { ...d, username: username.toLowerCase(), expiry: expiry.toISOString(), before });
      expect(message).toMatch(/created successfully/i);
      await admin.openTeachers();
      const after = await admin.recordsFound();
      state.set(KEY, { after });
      await admin.searchTeachers(d.last);
      await expect(admin.teacherRow(username.toLowerCase())).toBeVisible();
      // The panel accepts the new user name with the default password (and asks for a new password).
      const t = await openTeach(browser);
      try {
        const o = await passwordSignIn(t, username.toLowerCase(), DEFAULT_PASSWORD);
        expect(o.screen, `after signing in with the default password: ${o.message}`).toBe('set-password');
      } finally {
        await t.context.close();
      }
    }
  );

  test('ADM-10-16: Records Found goes up by one after a teacher is created', { tag: ['@functional'] }, async () => {
    const t = state.teacher(KEY);
    expect(t.after).toBe(t.before + 1);
  });

  test(
    'ADM-10-14: a created teacher can sign in to Teach Mode with the new user name and password',
    { tag: ['@smoke', '@functional'] },
    async ({ browser }) => {
      const d = state.teacher(KEY);
      const t = await openTeach(browser);
      try {
        const o = await firstSignIn(t, d.username, d.password1, d.pin1);
        expect(o.screen, `at "${o.step}": ${o.message}`).toBe('signed-in');
        state.set(KEY, { password: d.password1, pin: d.pin1 });
      } finally {
        await t.context.close();
      }
    }
  );

  test(
    'ADM-10-15: a created teacher shows ACTIVE / ACTIVE in the teacher list',
    { tag: ['@functional'] },
    async ({ admin }) => {
      const d = state.teacher(KEY);
      await admin.findTeacher(d.username);
      const row = (await admin.teacherRows()).find((r) => r[1] === d.username);
      expect(row.slice(2)).toEqual(['ACTIVE', 'ACTIVE']);
    }
  );

  test('ADM-10-12: creating a user name that already exists is refused', { tag: ['@negative'] }, async ({ admin }) => {
    const d = state.teacher(KEY);
    await admin.openTeachers();
    const before = await admin.recordsFound();
    // Same names → the same suggested user name.
    await admin.createTeacherButton.click();
    await admin.fillUserDetails({
      title: 'Mr',
      first: d.first,
      last: d.last,
      email: `dup.${d.email}`,
      contact: '9876543210',
      subject: 'Science',
    });
    await admin.dismissKeyboard();
    await admin.nextButton.click();
    await admin.setLoginDetails();
    await admin.pickExpiryDate(daysFromNow(30));
    await admin.fc('username').fill(d.username);
    let message = '';
    if (await admin.submitButton.isEnabled()) {
      await admin.dismissKeyboard();
      await admin.submitButton.click();
      message = await admin.toastText();
    }
    await admin.closeAllModals();
    await admin.openTeachers();
    expect(await admin.recordsFound(), `a second "${d.username}" was created ("${message}")`).toBe(before);
  });
});
