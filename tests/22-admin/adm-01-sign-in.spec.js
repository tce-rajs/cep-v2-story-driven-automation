// ADM-01 — Sign in and sign out (Admin panel)
// Source: CEPV2_Stories/22_Admin.md
//
// Every test here starts its own browser context (sign-in box, nothing remembered). ADM-01-06 (wrong password) is not
// automated: repeated wrong passwords may lock the shared admin account.
const { test, expect, AdminPage } = require('./admin-helpers');

const BAD_LOGIN = /Incorrect Org Id or User Id or Password/i;

test.describe('ADM-01 Sign in and sign out', () => {
  test.skip(!AdminPage.configured, 'set ADMIN_URL, ADMIN_SCHOOL, ADMIN_USERNAME and ADMIN_PASSWORD in .env');

  let context;
  let admin;
  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    admin = new AdminPage(await context.newPage());
  });
  test.afterEach(async () => {
    await context.close();
  });

  test(
    'ADM-01-01: signing in with the school name, user ID and password opens the Dashboard',
    { tag: ['@smoke', '@functional'] },
    async () => {
      await admin.signIn();
      await expect(admin.dashboardTitle.first()).toBeVisible();
      await expect(admin.page.getByText('School Statistics')).toBeVisible();
    }
  );

  test("ADM-01-02: the header shows the signed-in admin's name after sign-in", { tag: ['@functional'] }, async () => {
    await admin.signIn();
    await expect(admin.userNameText).toHaveText(/\S+/);
    await admin.openUserMenu();
    const shown = (await admin.userNameText.innerText()).replace(/\s+/g, ' ').trim();
    await expect(admin.userMenu, 'the user menu says who is signed in').toContainText(/Signed in as/i);
    await expect(admin.userMenu).toContainText(shown.split(' ')[0]);
  });

  test('ADM-01-03: Sign In stays disabled while any of the three fields is empty', { tag: ['@negative'] }, async () => {
    const combos = [
      { school: undefined, user: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD, empty: 'school' },
      { school: process.env.ADMIN_SCHOOL, user: '', password: process.env.ADMIN_PASSWORD, empty: 'user ID' },
      { school: process.env.ADMIN_SCHOOL, user: process.env.ADMIN_USERNAME, password: '', empty: 'password' },
    ];
    for (const c of combos) {
      await admin.openSignIn();
      await admin.fillSignIn({ school: c.school || '', user: c.user, password: c.password });
      await admin.page.waitForTimeout(800);
      expect(await admin.isSignInEnabled(), `Sign In enabled with an empty ${c.empty}`).toBe(false);
    }
  });

  test(
    'ADM-01-04: an unknown school name shows "Incorrect Org Id or User Id or Password"',
    { tag: ['@negative'] },
    async () => {
      await admin.openSignIn();
      await admin.fillSignIn({ school: 'Zzqx Unknown School' });
      await admin.signInButton.click();
      await expect(admin.signInError).toBeVisible({ timeout: 15000 });
      await expect(admin.dashboardTitle).toHaveCount(0);
    }
  );

  test(
    'ADM-01-05: an unknown user ID shows "Incorrect Org Id or User Id or Password"',
    { tag: ['@negative'] },
    async () => {
      await admin.openSignIn();
      await admin.fillSignIn({ user: 'autoqa.nosuchuser' });
      await admin.signInButton.click();
      await expect(admin.signInError).toBeVisible({ timeout: 15000 });
      await expect(admin.dashboardTitle).toHaveCount(0);
    }
  );

  test("ADM-01-07: a teacher's credentials do not open the Admin panel", { tag: ['@negative'] }, async () => {
    test.skip(!process.env.USERNAME || !process.env.PASSWORD, 'set USERNAME and PASSWORD (a teacher) in .env');
    await admin.openSignIn();
    await admin.fillSignIn({ user: process.env.USERNAME, password: process.env.PASSWORD });
    await admin.signInButton.click();
    await admin.page.waitForTimeout(5000);
    await expect(admin.dashboardTitle, 'no Dashboard for a teacher').toHaveCount(0);
    await expect(admin.signInButton).toBeVisible();
  });

  test('ADM-01-08: Sign Out returns to the sign-in box', { tag: ['@smoke', '@functional'] }, async () => {
    await admin.signIn();
    await admin.signOut();
    await expect(admin.signInButton).toBeVisible();
    await expect(admin.dashboardTitle).toHaveCount(0);
  });

  test('ADM-01-09: pressing Back after Sign Out does not show any admin page', { tag: ['@negative'] }, async () => {
    await admin.signIn();
    await admin.openTeachers();
    await admin.signOut();
    await admin.page.goBack().catch(() => {});
    await admin.page.waitForTimeout(3000);
    await expect(admin.page.getByText('Teacher’s List')).toHaveCount(0);
    await expect(admin.dashboardTitle).toHaveCount(0);
    await expect(admin.userToggle).toHaveCount(0);
  });

  test(
    'ADM-01-10: opening the admin URL in a new browser without signing in shows the sign-in box',
    { tag: ['@negative'] },
    async () => {
      await admin.page.goto(`${AdminPage.url}#/canvas`, { waitUntil: 'load' });
      await expect(admin.signInButton).toBeVisible({ timeout: 30000 });
      await expect(admin.dashboardTitle).toHaveCount(0);
    }
  );

  test('ADM-01-11: reloading the page keeps the admin signed in', { tag: ['@regression'] }, async () => {
    await admin.signIn();
    await admin.page.reload({ waitUntil: 'load' });
    await admin.page.waitForTimeout(4000);
    await expect(admin.dashboardTitle.first(), 'still on the Dashboard after a reload (Admin F-03)').toBeVisible();
  });

  test('ADM-01-12: the user menu shows the admin build number', { tag: ['@functional'] }, async () => {
    await admin.signIn();
    await admin.openUserMenu();
    await expect(admin.menuBuild).toHaveText(/Build:\s*\d+(\.\d+)+/);
  });
});
