// LOG-04 — Sign in with a password
// Source: CEPV2_Stories/03_Login.md
// The successful sign-in uses the spare account (DISPOSABLE_* in .env): the main account's stored password is
// currently rejected by the server.

const { test, expect } = require('../../fixtures');

const SCHOOL = process.env.DISPOSABLE_SCHOOL_SEARCH_TERM;
const USER = process.env.DISPOSABLE_USERNAME;
const PWD = process.env.DISPOSABLE_PASSWORD;
const isAuthPost = (r) =>
  r.method() === 'POST' && /auth|login|sso|token/i.test(r.url()) && !/extend|refresh/i.test(r.url());

test.describe('LOG-04 Sign in with a password', () => {
  test.beforeEach(async ({ app }) => {
    await app.guest.open();
    await app.login.openSignIn();
    await app.login.switchToPasswordView();
    await expect(app.login.passwordForm).toBeVisible({ timeout: 10000 });
  });

  test(
    'LOG-04-01: "Sign in with Password" shows School, User ID and Password in that order',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      const ys = [];
      for (const field of [app.login.schoolSelect, app.login.usernameInput, app.login.passwordInput]) {
        await expect(field).toBeVisible();
        ys.push((await field.boundingBox()).y);
      }
      expect(ys[0], 'School above User ID').toBeLessThan(ys[1]);
      expect(ys[1], 'User ID above Password').toBeLessThan(ys[2]);
    }
  );

  test(
    'LOG-04-02: typing part of a school name lists matching schools',
    { tag: ['@functional'] },
    async ({ app, page }) => {
      await app.login.schoolSelect.click();
      await page.keyboard.type(process.env.SCHOOL_SEARCH_TERM.slice(0, 4));
      const options = page.locator('.ng-option').filter({ visible: true });
      await expect(options.first()).toBeVisible({ timeout: 10000 });
      await expect(options.filter({ hasText: new RegExp(process.env.SCHOOL_NAME, 'i') }).first()).toBeVisible();
    }
  );

  test(
    'LOG-04-03: a school name that matches nothing shows "No items found"',
    { tag: ['@negative'] },
    async ({ app, page }) => {
      await app.login.schoolSelect.click();
      await page.keyboard.type('zzqxwvv');
      await expect(page.locator('.ng-option').filter({ hasText: /no items found/i })).toBeVisible({ timeout: 10000 });
    }
  );

  test('LOG-04-04: the clear (x) button empties the School field', { tag: ['@functional'] }, async ({ app }) => {
    await app.login.selectSchool(process.env.SCHOOL_SEARCH_TERM);
    await expect(app.login.schoolSelect.locator('.ng-value')).toBeVisible();
    await app.login.schoolSelect.locator('.ng-clear-wrapper').click();
    await expect(app.login.schoolSelect.locator('.ng-value')).toHaveCount(0);
  });

  test('LOG-04-05: Sign In stays disabled until every field is filled', { tag: ['@functional'] }, async ({ app }) => {
    await expect(app.login.submitButton).toBeDisabled();
    await app.login.selectSchool(process.env.SCHOOL_SEARCH_TERM);
    await expect(app.login.submitButton).toBeDisabled();
    await app.login.usernameInput.fill('someone');
    await expect(app.login.submitButton).toBeDisabled();
    await app.login.passwordInput.fill('Something1!');
    await expect(app.login.submitButton).toBeEnabled();
  });

  test(
    'LOG-04-06: signing in with a valid school, User ID and password succeeds',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      test.skip(!USER || !PWD, 'Needs the spare account (DISPOSABLE_* in .env).');
      await app.login.selectSchool(SCHOOL);
      await app.login.usernameInput.fill(USER);
      await app.login.passwordInput.fill(PWD);
      await app.login.submitButton.click();
      await expect(app.login.avatar).toBeVisible({ timeout: 20000 });
    }
  );

  test(
    'LOG-04-07: a User ID typed in a different letter case signs in the same way',
    { tag: ['@edge'] },
    async ({ app }) => {
      test.skip(!USER || !PWD, 'Needs the spare account (DISPOSABLE_* in .env).');
      await app.login.selectSchool(SCHOOL);
      await app.login.usernameInput.fill(USER.toUpperCase());
      await app.login.passwordInput.fill(PWD);
      await app.login.submitButton.click();
      await expect(app.login.avatar).toBeVisible({ timeout: 20000 });
    }
  );

  test(
    'LOG-04-08: double-clicking Sign In submits only once (regression)',
    { tag: ['@regression', '@bug'] },
    async ({ app, page }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232): a double-click on Sign In sends TWO
      // POST .../tce-auth-api/0/api/1/sso/token requests. The sign-in still succeeds, but the button is not guarded.
      test.fail(true, 'Double-clicking Sign In sends two sso/token sign-in requests');
      test.skip(!USER || !PWD, 'Needs the spare account (DISPOSABLE_* in .env).');
      const posts = [];
      page.on('request', (r) => isAuthPost(r) && posts.push(r.url()));
      await app.login.selectSchool(SCHOOL);
      await app.login.usernameInput.fill(USER);
      await app.login.passwordInput.fill(PWD);
      await app.login.submitButton.dblclick();
      await expect(app.login.avatar).toBeVisible({ timeout: 20000 });
      await page.waitForTimeout(2000);
      expect(posts, `one sign-in request (saw: ${posts.join(', ')})`).toHaveLength(1);
    }
  );

  test('LOG-04-09: "Sign in with Pin" switches back to the PIN view', { tag: ['@functional'] }, async ({ app }) => {
    await app.login.pinLink.click();
    await expect(app.login.pinForm).toBeVisible();
    await expect(app.login.pinDigitBox(0)).toBeVisible();
    await expect(app.login.passwordForm).toBeHidden();
  });
});
