// NEW-02 — PIN setup on first successful password login
// Source: CEPV2_Stories/02_NewUserFlow.md
//
// Continues directly from new-01-first-login.spec.js: the account is now on its new password and has NOT set a PIN.
// Order matters: the negative PIN-format check (NEW-02-04) has to run
// while the PIN-setup page is still being shown, so it comes BEFORE the test that actually sets the PIN.

const { test, expect } = require('../../fixtures');
const { NewUserPage } = require('../../pages/new-user.page');

test.describe.configure({ mode: 'serial' });

test.describe('NEW-02 PIN setup on first successful password login', () => {
  test.skip(
    !NewUserPage.configured,
    'set NEW_USER_USERNAME, NEW_USER_NEW_PASSWORD and NEW_USER_PIN in .env (see .env.example)'
  );

  const { newPassword, pin } = NewUserPage.credentials;

  test(
    'NEW-02-01: signing in with the new password presents a PIN setup page before entering the app',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      await app.newUser.signInWithPassword(newPassword);

      await expect(app.newUser.pinSetupHeading, 'the PIN setup page').toBeVisible({ timeout: 20000 });
      await expect(app.login.avatar, 'the app itself is not entered yet').toBeHidden();
    }
  );

  // PIN format: too short (NEW-02-04) and letters (NEW-02-05), one test each. Both run while the
  // PIN-setup page is still shown and set nothing, so the order is unaffected.
  const openPinSetup = async (app) => {
    await app.newUser.signInWithPassword(newPassword);
    await expect(app.newUser.pinInputs.first()).toBeVisible({ timeout: 20000 });
    const boxes = app.newUser.pinInputs;
    return { boxes, values: () => boxes.evaluateAll((els) => els.map((e) => e.value)) };
  };

  test('NEW-02-04: a PIN that is too short (3 digits) cannot be submitted', { tag: ['@negative'] }, async ({ app }) => {
    const { boxes, values } = await openPinSetup(app);
    // Three digits leave Next disabled, so the PIN cannot be submitted, and the empty boxes are flagged.
    await app.newUser.typeIntoBoxes(boxes, '123');
    expect(await values(), 'the three digits are in the boxes').toEqual(['1', '2', '3', '', '']);
    await expect(app.newUser.pinNextBtn, 'a 3-digit PIN cannot be submitted').toBeDisabled();
    await expect(app.newUser.pinVerifyInputs, 'and the page does not move on').toHaveCount(0);
    await expect(app.login.avatar, 'and it did not get through').toBeHidden();
    test.info().annotations.push({
      type: 'note',
      description:
        'GAP: a too-short PIN is refused only by a disabled Next button and red-outlined empty boxes; there is no text message saying why.',
    });
  });

  test('NEW-02-05: letters are not accepted into the PIN boxes', { tag: ['@negative'] }, async ({ app }) => {
    const { boxes, values } = await openPinSetup(app);
    // Only four letters are typed: see the note at the foot of this file for what the fifth does.
    await app.newUser.typeIntoBoxes(boxes, 'abcd');
    expect(await values(), 'letters are not accepted into the boxes').toEqual(['', '', '', '', '']);
    await expect(app.newUser.pinNextBtn, 'nothing can be submitted').toBeDisabled();
    await expect(app.login.avatar, 'and it did not get through').toBeHidden();
  });

  // Runs before NEW-02-02: a refused confirmation leaves the account still without a PIN.
  test(
    'NEW-02-06: a different PIN in the confirmation step is refused with a clear message',
    { tag: ['@negative'] },
    async ({ app }) => {
      await openPinSetup(app);
      await app.newUser.enterPin(pin);
      await expect(app.newUser.pinVerifyInputs.first(), 'set-up: the Verify PIN step').toBeVisible({ timeout: 10000 });
      // The same PIN with its last digit changed.
      const other = pin.slice(0, -1) + String((Number(pin.slice(-1)) + 1) % 10);
      await app.newUser.confirmPin(other);
      await expect(
        app.page.getByText(/(does not|doesn't|do not|don't) match|mismatch|not the same|incorrect|invalid/i).first(),
        'a message says the two PINs differ'
      ).toBeVisible({ timeout: 10000 });
      await expect(app.login.avatar, 'the mismatched PIN did not get through').toBeHidden();
      await expect(
        app.newUser.pinVerifyInputs.or(app.newUser.pinInputs).first(),
        'still on PIN setup, so the PIN can be entered again'
      ).toBeVisible();
    }
  );

  test('NEW-02-02: setting a new PIN completes successfully', { tag: ['@smoke', '@functional'] }, async ({ app }) => {
    await app.newUser.signInWithPassword(newPassword);
    await expect(app.newUser.pinInputs.first()).toBeVisible({ timeout: 20000 });

    await app.newUser.enterPin(pin);
    await expect(app.newUser.pinVerifyInputs.first(), 'it asks for the PIN to be verified').toBeVisible({
      timeout: 10000,
    });
    await app.newUser.confirmPin(pin);

    // Setup is done: the PIN page is gone and the user moves on into the app.
    await expect(app.newUser.pinVerifyInputs).toHaveCount(0, { timeout: 20000 });
    await expect(app.login.avatar, 'moved on into the app (signed in)').toBeVisible({
      timeout: 20000,
    });
  });

  test(
    'NEW-02-03: the user can subsequently log in using the PIN, as an alternative to the password',
    { tag: ['@functional'] },
    async ({ app }) => {
      // Start signed out, so the check proves the PIN itself signs in (a session kept from the previous test once
      // made this pass while the PIN had not been saved).
      await app.login.open();
      if (await app.login.avatar.isVisible().catch(() => false)) await app.userMenu.signOut();
      await expect(app.login.avatar, 'signed out before the PIN check').toBeHidden();
      await app.signIn(pin);
      await expect(app.login.avatar, 'signed in with the PIN').toBeVisible();
      await expect(app.page.getByText(/invalid pin/i), 'the PIN was accepted').toBeHidden();
    }
  );
});

// NEW-02-04 checks letter input only up to the fourth key press: the fifth key press advances the page, which would
// use up the account's one-time PIN set-up.
