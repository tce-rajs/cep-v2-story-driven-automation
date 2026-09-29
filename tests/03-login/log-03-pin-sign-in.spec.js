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

  // The on-screen keypad's digit, Backspace and Enter keys: one test each (split 2026-09-28).
  // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232, desktop client 1536x864): clicking a PIN box opens the
  // on-screen keyboard (a full QWERTY layout, not a number pad) BELOW the visible window -- its top row starts at
  // y~834 and the digit keys at y~869, so none of it can be clicked. Same defect as TB-09-08 (chapter search).
  const KEYPAD_OFF_SCREEN =
    'On-screen keyboard opens below the visible window on the PIN screen, so its keys cannot be used';
  const openKeypad = async (app, page) => {
    await app.login.pinDigitBox(0).click();
    const key = (k) => page.locator(`.simple-keyboard .hg-button[data-skbtn="${k}"]`).filter({ visible: true }).first();
    await expect(key('1'), 'keypad shown').toBeVisible({ timeout: 8000 });
    return key;
  };

  test(
    "LOG-03-04: the on-screen keypad's digit keys type into the PIN boxes",
    { tag: ['@functional', '@bug'] },
    async ({ app, page }) => {
      test.fail(true, KEYPAD_OFF_SCREEN);
      const key = await openKeypad(app, page);
      await key('9').click();
      await expect(app.login.pinDigitBox(0)).toHaveValue('9');
    }
  );

  test(
    "LOG-03-10: the on-screen keypad's Backspace key clears a digit",
    { tag: ['@functional', '@bug'] },
    async ({ app, page }) => {
      test.fail(true, KEYPAD_OFF_SCREEN);
      const key = await openKeypad(app, page);
      await key('9').click();
      await key('{bksp}').click();
      await expect(app.login.pinDigitBox(0), 'Backspace cleared the digit').toHaveValue('');
    }
  );

  test(
    'LOG-03-11: a PIN entered on the on-screen keypad signs in (with Enter if needed)',
    { tag: ['@functional', '@bug'] },
    async ({ app, page }) => {
      test.fail(true, KEYPAD_OFF_SCREEN);
      const key = await openKeypad(app, page);
      for (const d of String(PIN)) await key(d).click();
      if (!(await app.login.avatar.isVisible().catch(() => false)))
        await key('{enter}')
          .click()
          .catch(() => {});
      await expect(app.login.avatar, 'the keypad PIN signs in').toBeVisible({ timeout: 20000 });
    }
  );

  test(
    'LOG-03-05: "Disable Virtual Keyboard" hides the on-screen keypad',
    { tag: ['@functional', '@bug'] },
    async ({ app, page }) => {
      // Same finding as LOG-03-04: the "Disable Virtual Keyboard" control is part of the keyboard drawn below the window
      // (y~834 in an 864px window), so it cannot be reached.
      test.fail(true, '"Disable Virtual Keyboard" is drawn below the visible window with the rest of the keyboard');
      await app.login.pinDigitBox(0).click();
      const keypad = page.locator('.simple-keyboard').filter({ visible: true }).first();
      await expect(keypad).toBeVisible({ timeout: 8000 });
      await page
        .getByText(/disable virtual keyboard/i)
        .first()
        .click();
      await expect(page.locator('.simple-keyboard').filter({ visible: true })).toHaveCount(0, { timeout: 5000 });
      // Turn it back on for later tests (the setting is remembered) -- the same control now reads "Enable".
      await page
        .getByText(/enable virtual keyboard/i)
        .first()
        .click({ timeout: 3000 })
        .catch(() => {});
    }
  );

  test('LOG-03-06: pasting a five-digit PIN fills the boxes', { tag: ['@edge', '@bug'] }, async ({ app, page }) => {
    // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232): Ctrl+V of a 5-digit PIN puts only its FIRST digit in box 1
    // -- the rest is dropped, with no message. The story (and the reference suite's PIN-22) expects either the digits
    // spread across the boxes or a clear "paste not supported".
    test.fail(true, 'Pasting a 5-digit PIN fills only the first box, silently dropping the other digits');
    await app.login.pinDigitBox(0).click();
    await page.evaluate((pin) => navigator.clipboard.writeText(pin), String(PIN));
    await page.keyboard.press('Control+V');
    await expect
      .poll(
        async () => {
          if (await app.login.avatar.isVisible().catch(() => false)) return 'signed in';
          let v = '';
          for (let i = 0; i < 5; i++)
            v += await app.login
              .pinDigitBox(i)
              .inputValue()
              .catch(() => '');
          return v === String(PIN) ? 'filled' : v;
        },
        { timeout: 10000 }
      )
      .toMatch(/signed in|filled/);
  });

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
});
