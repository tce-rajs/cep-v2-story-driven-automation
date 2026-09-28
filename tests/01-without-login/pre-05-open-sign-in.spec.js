// PRE-05 — Open Sign In from Guest Mode
// Source: CEPV2_Stories/01_WithoutLogin.md
// The Sign In window never leaves the page: closed = no `login-modal-outer--active` class, slid out of view.

const { test, expect } = require('../../fixtures');

test.describe('PRE-05 Open Sign In from Guest Mode', () => {
  test.beforeEach(async ({ app }) => {
    await app.guest.open();
  });

  test(
    'PRE-05-01: the Guest Mode message is visible before signing in',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      await expect(app.login.guestModeText).toBeVisible({ timeout: 15000 });
    }
  );

  test(
    'PRE-05-02: clicking Sign in opens the PIN sign-in view by default',
    { tag: ['@functional'] },
    async ({ app }) => {
      await app.login.openSignIn();
      await expect(app.login.pinForm).toBeVisible({ timeout: 10000 });
      await expect(app.login.pinDigitBox(0)).toBeVisible();
      await expect(app.login.passwordForm).toBeHidden();
    }
  );

  test('PRE-05-03: the Sign In window can be closed and opened again', { tag: ['@functional'] }, async ({ app }) => {
    await app.login.openSignIn();
    await expect(app.login.modal, 'Sign In open').toHaveClass(/login-modal-outer--active/, { timeout: 10000 });
    await app.login.closeSignIn();
    await expect(app.login.modal, 'Sign In closed').not.toHaveClass(/login-modal-outer--active/, { timeout: 10000 });
    await expect(app.login.pinDigitBox(0), 'slid out of view').not.toBeInViewport();
    await app.login.openSignIn();
    await expect(app.login.modal, 'Sign In open').toHaveClass(/login-modal-outer--active/, { timeout: 10000 });
    await expect(app.login.pinDigitBox(0)).toBeVisible();
  });

  test(
    'PRE-05-04: content drawn in Guest Mode is unchanged after opening and closing the Sign In window',
    { tag: ['@edge'] },
    async ({ app }) => {
      await app.guest.draw();
      const before = await app.content.pathGeometry();
      expect(before.length, 'something drawn').toBeGreaterThan(0);
      await app.login.openSignIn();
      await expect(app.login.modal, 'Sign In open').toHaveClass(/login-modal-outer--active/, { timeout: 10000 });
      await app.login.closeSignIn();
      await expect(app.login.modal, 'Sign In closed').not.toHaveClass(/login-modal-outer--active/, { timeout: 10000 });
      await expect(app.login.pinDigitBox(0), 'slid out of view').not.toBeInViewport();
      expect(await app.content.pathGeometry(), 'drawing unchanged').toEqual(before);
    }
  );
});
