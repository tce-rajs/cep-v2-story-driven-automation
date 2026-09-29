// NEW-01 — First login: default password forces a password reset
// Source: CEPV2_Stories/02_NewUserFlow.md
//
// ONE-SHOT PER FRESH ACCOUNT. The steps really change the account (default password -> new password), so this whole
// module can only run against a user that has never logged in — see NEW_USER_* in .env.example. The tests run in
// order and each leaves the account at the start of the next one's step:
//   default password entered  ->  "set new password" screen (left unfinished)  ->  new password set  ->  ...
// Because of that the order in this file is deliberate (NEW-01-05 sits before NEW-01-04) and it is not safe to run
// a single test from here on its own after the account has moved on.

const { test, expect } = require('../../fixtures');
const { NewUserPage } = require('../../pages/new-user.page');

test.describe.configure({ mode: 'serial' });

test.describe('NEW-01 First login: default password forces a password reset', () => {
  test.skip(
    !NewUserPage.configured,
    'set NEW_USER_USERNAME, NEW_USER_NEW_PASSWORD and NEW_USER_PIN in .env (see .env.example)'
  );

  const { username, newPassword, schoolSearchTerm } = NewUserPage.credentials;

  // The two school paths, one test each (split 2026-09-28; neither changes the account, so the order is unaffected):
  // the pre-selected school (NEW-01-01) and choosing the school by hand (NEW-01-06).
  const openPasswordView = async (login) => {
    await login.open();
    await login.openSignIn();
    await login.switchToPasswordView();
    await expect(login.schoolSelect).toBeVisible();
  };

  test(
    'NEW-01-01: with the school as pre-selected (if at all), the username field is reachable',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      await openPasswordView(app.login);
      await expect(app.login.usernameInput).toBeVisible();
    }
  );

  test(
    'NEW-01-06: choosing the school by hand shows the chosen school, and the username field is reachable',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      const { login } = app;
      await openPasswordView(login);
      await login.selectSchool(schoolSearchTerm);
      await expect(login.schoolSelect).toContainText(new RegExp(schoolSearchTerm, 'i'));
      await expect(login.usernameInput).toBeVisible();
      await login.usernameInput.fill(username);
      await expect(login.usernameInput).toHaveValue(username);
    }
  );

  test(
    'NEW-01-02: entering the username and the default password `classedge` triggers a forced "set new password" step',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      await app.newUser.signInWithPassword(NewUserPage.defaultPassword);

      await expect(app.newUser.setPasswordHeading, 'a forced "set new password" step appears').toBeVisible({
        timeout: 20000,
      });
      await expect(app.login.avatar, 'and the user is NOT logged straight in').toBeHidden();
    }
  );

  test(
    'NEW-01-03: setting the new password succeeds and returns the user to the sign-in page, not logged in',
    { tag: ['@functional'] },
    async ({ app }) => {
      await app.newUser.signInWithPassword(NewUserPage.defaultPassword);
      await expect(app.newUser.setPasswordHeading).toBeVisible({ timeout: 20000 });

      await app.newUser.setNewPassword(newPassword);

      // Back at sign-in — not auto-logged-in.
      await expect(app.login.passwordForm.or(app.login.pinForm), 'returned to the sign-in page').toBeVisible({
        timeout: 20000,
      });
      await expect(app.login.avatar).toBeHidden();
    }
  );

  // Ordered before NEW-01-04 on purpose: it needs the account to be in the "password already changed" state, and
  // NEW-01-04 is what moves it on to PIN setup.
  test(
    'NEW-01-05: the old default password (`classedge`) no longer works once the new password is set',
    { tag: ['@negative'] },
    async ({ app }) => {
      await app.newUser.signInWithPassword(NewUserPage.defaultPassword);

      await expect(app.login.passwordErrorMessage).toBeVisible({ timeout: 15000 });
      await expect(app.login.passwordErrorMessage).toContainText(/credentials are invalid/i);
      await expect(app.login.avatar).toBeHidden();
    }
  );

  test(
    'NEW-01-04: signing in again with the username and the newly-set password succeeds',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      await app.newUser.signInWithPassword(newPassword);

      // "Succeeds": no credential error, and it moves on — to PIN setup (NEW-02) before the app.
      await expect(app.login.passwordErrorMessage).toBeHidden({ timeout: 5000 });
      await expect(app.newUser.pinSetupHeading.or(app.login.avatar), 'signed in and moved on').toBeVisible({
        timeout: 20000,
      });
    }
  );
});
