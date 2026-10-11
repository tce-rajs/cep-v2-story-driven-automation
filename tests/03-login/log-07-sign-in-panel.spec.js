// LOG-07 — Sign In panel
// Source: CEPV2_Stories/03_Login.md
// Signed out, the panel is collapsed at the bottom; its toggle (login-auth-toggle-button) expands it, adding the
// login-modal-outer--active class. Expanded, the same toggle shows a close icon (login-auth-collapse-icon).

const { test, expect } = require('../../fixtures');

const ACTIVE = /login-modal-outer--active/;

test.describe('LOG-07 Sign In panel', () => {
  test.beforeEach(async ({ app }) => {
    await app.guest.open();
  });

  test(
    'LOG-07-01: the arrow expands the Sign In panel and shows the news picture beside the PIN form',
    { tag: ['@functional'] },
    async ({ app }) => {
      await app.login.toggleButton.click({ force: true });
      await expect(app.login.modal, 'the panel is expanded').toHaveClass(ACTIVE);
      await expect(app.login.pinDigitBox(0), 'the PIN form').toBeVisible();
      // The news picture is an image element or a background image inside the panel.
      const pictures = await app.login.modal.evaluate(
        (el) =>
          [...el.querySelectorAll('*')].filter((n) => {
            const r = n.getBoundingClientRect();
            if (r.width < 100 || r.height < 100) return false;
            return n.tagName === 'IMG' || getComputedStyle(n).backgroundImage !== 'none';
          }).length
      );
      expect(pictures, 'a picture is shown in the panel').toBeGreaterThan(0);
    }
  );

  test(
    'LOG-07-02: the arrow collapses the expanded panel again, and the PIN boxes still work',
    { tag: ['@functional'] },
    async ({ app }) => {
      await app.login.toggleButton.click({ force: true });
      await expect(app.login.modal, 'set-up: expanded').toHaveClass(ACTIVE);
      await app.login.toggleButton.click({ force: true });
      await expect(app.login.modal, 'collapsed').not.toHaveClass(ACTIVE);
      await app.login.toggleButton.click({ force: true });
      await app.login.pinDigitBox(0).fill('1');
      await expect(app.login.pinDigitBox(0), 'the PIN box takes a digit').toHaveValue('1');
    }
  );

  test(
    'LOG-07-03: the close (X) button closes the Sign In panel and leaves the board in Guest Mode',
    { tag: ['@functional'] },
    async ({ app }) => {
      await app.login.toggleButton.click({ force: true });
      await expect(app.login.modal, 'set-up: expanded').toHaveClass(ACTIVE);
      await app.login.page.locator('[data-qa-id="login-auth-collapse-icon"]').click({ force: true });
      await expect(app.login.modal, 'closed').not.toHaveClass(ACTIVE);
      await expect(app.login.guestModeText, 'Guest Mode').toBeVisible();
      await expect(app.login.avatar, 'not signed in').toBeHidden();
    }
  );

  // Terms (LOG-07-04) and Privacy Policy (LOG-07-05): the link must open the page, in a new window or in the app.
  for (const [id, name] of [
    ['LOG-07-04', 'Terms'],
    ['LOG-07-05', 'Privacy Policy'],
  ]) {
    test(`${id}: the ${name} link opens the ${name} page`, { tag: ['@functional'] }, async ({ app, page }) => {
      await app.login.toggleButton.click({ force: true });
      const link = app.login.modal.getByRole('link', { name, exact: true });
      await expect(link, `set-up: the ${name} link is shown`).toBeVisible();
      const urlBefore = page.url();
      const popup = page
        .context()
        .waitForEvent('page', { timeout: 8000 })
        .catch(() => null);
      await link.click({ force: true });
      const opened = await popup;
      await page.waitForTimeout(1500);
      const dialog = page.locator('mat-dialog-container, [role=dialog]').filter({ hasText: new RegExp(name, 'i') });
      // A changed address only counts if it is the page itself (a bare "#" link changes the address but opens nothing).
      const shown =
        !!opened || (page.url() !== urlBefore && /terms|privacy/i.test(page.url())) || (await dialog.count()) > 0;
      if (opened) await opened.close().catch(() => {});
      expect(shown, `the ${name} page opens`).toBe(true);
    });
  }

  test(
    'LOG-07-06: the keyboard button on the PIN form opens the on-screen keypad',
    { tag: ['@functional'] },
    async ({ app, page }) => {
      await app.login.openSignIn();
      await page.locator('[data-qa-id="login-pin-keyboard-button"]').click({ force: true });
      const keypad = page.locator('.simple-keyboard').filter({ visible: true }).first();
      await expect(keypad, 'the keypad opens').toBeVisible({ timeout: 5000 });
      for (const key of ['1', '0', '{bksp}', '{enter}'])
        await expect(keypad.locator(`[data-skbtn="${key}"]`), `key ${key}`).toBeVisible();
    }
  );

  test(
    'LOG-07-07: the keyboard button on the password form opens the on-screen keyboard too',
    { tag: ['@functional'] },
    async ({ app, page }) => {
      await app.login.openSignIn();
      await app.login.switchToPasswordView();
      await page.locator('[data-qa-id="login-pwd-keyboard-button"]').click({ force: true });
      await expect(
        page.locator('.simple-keyboard').filter({ visible: true }).first(),
        'the keyboard opens'
      ).toBeVisible({
        timeout: 5000,
      });
    }
  );

  test(
    'LOG-07-08: closing the Sign In panel half-way through typing a PIN signs no one in and clears the boxes',
    { tag: ['@negative'] },
    async ({ app }) => {
      await app.login.openSignIn();
      await expect(app.login.modal, 'set-up: expanded').toHaveClass(ACTIVE);
      await app.login.pinDigitBox(0).fill('1');
      await app.login.pinDigitBox(1).fill('2');
      await app.login.closeSignIn();
      await expect(app.login.modal, 'closed').not.toHaveClass(ACTIVE);
      await expect(app.login.avatar, 'no one signed in').toBeHidden();
      await expect(app.login.guestModeText, 'still Guest Mode').toBeVisible();
      await app.login.openSignIn();
      await expect(app.login.modal, 'opened again').toHaveClass(ACTIVE);
      const values = [];
      for (let i = 0; i < 5; i++) values.push(await app.login.pinDigitBox(i).inputValue());
      expect(values, 'the half-typed PIN was cleared').toEqual(['', '', '', '', '']);
    }
  );
});
