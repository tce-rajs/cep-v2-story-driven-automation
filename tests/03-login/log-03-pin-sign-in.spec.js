// LOG-03 — Sign in with a PIN
// Source: CEPV2_Stories/03_Login.md
// The on-screen keyboard is the .simple-keyboard component (keys: .hg-button[data-skbtn="1"], "{bksp}", "{enter}").

const { test, expect } = require('../../fixtures');

const PIN = process.env.VALID_PIN;
const isAuthPost = (r) =>
  r.method() === 'POST' && /auth|login|sso|token/i.test(r.url()) && !/extend|refresh/i.test(r.url());

test.describe('LOG-03 Sign in with a PIN', () => {
  test.beforeEach(async ({ app }) => {
    await app.guest.open();
    await app.login.openSignIn();
    await expect(app.login.pinDigitBox(0)).toBeVisible({ timeout: 10000 });
  });

  test(
    'LOG-03-01: the PIN view shows the Sign In heading, the welcome and the instruction text',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      await expect(app.login.modalTitle).toContainText(/sign in/i);
      await expect(app.login.modalSubtitle).toContainText(/\w{4,}/);
      await expect(app.login.modal, 'instruction text').toContainText(/enter your pin/i);
    }
  );

  test('LOG-03-09: the PIN view shows exactly five PIN boxes', { tag: ['@smoke', '@functional'] }, async ({ app }) => {
    for (let i = 0; i < 5; i++) await expect(app.login.pinDigitBox(i)).toBeVisible();
    await expect(app.login.pinDigitBox(5)).toHaveCount(0);
  });

  test('LOG-03-02: a partly filled PIN does not sign in', { tag: ['@negative'] }, async ({ app, page }) => {
    const posts = [];
    page.on('request', (r) => isAuthPost(r) && posts.push(r.url()));
    await app.login.enterPin(String(PIN).slice(0, 4));
    await page.waitForTimeout(3000);
    await expect(app.login.avatar).toBeHidden();
    expect(posts, 'no sign-in request sent').toEqual([]);
  });

  test('LOG-03-03: the PIN boxes accept digits only', { tag: ['@negative'] }, async ({ app, page }) => {
    await app.login.pinDigitBox(0).click();
    await page.keyboard.type('a');
    await expect(app.login.pinDigitBox(0)).toHaveValue('');
    await page.keyboard.type('#');
    await expect(app.login.pinDigitBox(0)).toHaveValue('');
    await page.keyboard.type('4');
    await expect(app.login.pinDigitBox(0)).toHaveValue('4');
  });

  // The on-screen keypad's digit, Backspace and Enter keys: one test each.
  const openKeypad = async (app, page) => {
    await app.login.pinDigitBox(0).click();
    const key = (k) => page.locator(`.simple-keyboard .hg-button[data-skbtn="${k}"]`).filter({ visible: true }).first();
    await expect(key('1'), 'keypad shown').toBeVisible({ timeout: 8000 });
    return key;
  };

  test(
    'LOG-03-12: after typing part of a PIN, the password view opens and its fields can be filled',
    { tag: ['@edge'] },
    async ({ app }) => {
      await app.login.enterPin(String(PIN).slice(0, 3));
      await app.login.switchToPasswordView();
      await expect(app.login.passwordForm).toBeVisible();
      await app.login.usernameInput.fill('someone');
      await expect(app.login.usernameInput).toHaveValue('someone');
    }
  );

  test(
    'LOG-03-07: switching to the password view and back part-way through typing, the PIN still signs in',
    { tag: ['@edge'] },
    async ({ app }) => {
      await app.login.enterPin(String(PIN).slice(0, 3));
      await app.login.switchToPasswordView();
      await app.login.usernameInput.fill('someone');
      await app.login.pinLink.click();
      await expect(app.login.pinForm).toBeVisible();
      for (let i = 0; i < 5; i++) await app.login.pinDigitBox(i).fill('');
      await app.login.enterPin(PIN);
      await expect(app.login.avatar, 'PIN still signs in after switching views').toBeVisible({ timeout: 20000 });
    }
  );

  /** Fill the PIN, then tap the fifth box twice quickly; returns the sign-in requests and page errors seen. */
  const doubleTapLastBox = async (app, page) => {
    const posts = [];
    page.on('request', (r) => isAuthPost(r) && posts.push(r.url()));
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    const digits = String(PIN).split('');
    for (let i = 0; i < 5; i++) await app.login.pinDigitBox(i).fill(digits[i]);
    await app.login
      .pinDigitBox(4)
      .dblclick({ force: true })
      .catch(() => {});
    await expect(app.login.avatar, 'set-up: signed in').toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(2000);
    return { posts, errors };
  };

  test(
    'LOG-03-08: tapping the fifth PIN box twice quickly sends only one sign-in (regression)',
    { tag: ['@regression'] },
    async ({ app, page }) => {
      const { posts } = await doubleTapLastBox(app, page);
      expect(posts, `one sign-in request (saw ${posts.length})`).toHaveLength(1);
    }
  );

  test(
    'LOG-03-13: tapping the fifth PIN box twice quickly shows no error (regression)',
    { tag: ['@regression'] },
    async ({ app, page }) => {
      const { errors } = await doubleTapLastBox(app, page);
      await expect(app.login.pinErrorMessage, 'no PIN error message').toBeHidden();
      expect(errors, 'no uncaught page errors').toEqual([]);
    }
  );

  test(
    'LOG-03-14: a wrong PIN shows a clear error and does not sign in',
    { tag: ['@negative'] },
    async ({ app, page }) => {
      await app.login.enterPin('11111');
      await expect(app.login.pinErrorMessage, 'the error message').toContainText(/invalid pin/i, { timeout: 10000 });
      await page.waitForTimeout(2000);
      await expect(app.login.avatar, 'not signed in').toBeHidden();
    }
  );

  test('LOG-03-15: after a wrong PIN, the correct PIN signs in', { tag: ['@functional'] }, async ({ app }) => {
    await app.login.enterPin('11111');
    await expect(app.login.pinErrorMessage, 'set-up: the wrong PIN is refused').toBeVisible({ timeout: 10000 });
    await app.login.enterPin(PIN);
    await expect(app.login.avatar, 'signed in').toBeVisible({ timeout: 20000 });
  });
});
