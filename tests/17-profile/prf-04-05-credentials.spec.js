// PRF-04 — Change password; PRF-05 — Change PIN
// Source: CEPV2_Stories/17_Profile.md
// Runs ONLY on the spare account (DISPOSABLE_* in .env), never the main QA account (owner's decision, 2026-09-26).
// The successful-change cases set the original password/PIN back at the end. If putting it back fails, the test says
// what the credential now is, so .env can be updated by hand.

const { test, expect } = require('../../fixtures');

const PWD = process.env.DISPOSABLE_PASSWORD;
const PIN = process.env.DISPOSABLE_PIN;
const SCHOOL = process.env.DISPOSABLE_SCHOOL_SEARCH_TERM;
const USER = process.env.DISPOSABLE_USERNAME;

test.beforeEach(async ({ app }) => {
  test.skip(!PWD || !PIN || !USER, 'Needs the spare account (DISPOSABLE_* in .env).');
  await app.signIn(PIN);
});

test.afterEach(async ({ app }) => {
  await app.profile.closeWindow().catch(() => {});
});

test.describe('PRF-04 Change password', () => {
  // The form's fields and rules (PRF-04-01), and Save disabled while it is empty (PRF-04-09): one test each (split
  // 2026-09-28).
  test(
    'PRF-04-01: Change Password shows the Current, New and Repeat fields and the password rules',
    { tag: ['@functional'] },
    async ({ app }) => {
      const p = app.profile;
      await p.openChangePassword();
      await expect(p.currentPasswordInput).toBeVisible();
      await expect(p.newPasswordInput).toBeVisible();
      await expect(p.repeatPasswordInput).toBeVisible();
      await expect(p.changePasswordForm, 'password rules shown').toContainText(/8 characters/i);
    }
  );

  test('PRF-04-09: Change Password opens with Save disabled', { tag: ['@functional'] }, async ({ app }) => {
    const p = app.profile;
    await p.openChangePassword();
    await expect(p.changePasswordSaveBtn).toBeDisabled();
  });

  test(
    'PRF-04-02: a new password shorter than 8 characters shows an error while typing',
    { tag: ['@bug', '@negative'] },
    async ({ app }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232): typing a 3-character new password shows no error -- only the
      // permanent rules text ("Password must contain a minimum of 8 characters and include ...") is on the form.
      test.fail(true, 'No inline error appears for a too-short new password (only the permanent rules text)');
      const p = app.profile;
      await p.openChangePassword();
      await p.newPasswordInput.pressSequentially('Ab1');
      await expect(p.changePasswordForm).toContainText(/at least 8 characters/i);
      await expect(p.changePasswordSaveBtn).toBeDisabled();
    }
  );

  // Different New and Repeat values: a mismatch message (PRF-04-03), and Save stays blocked (PRF-04-10) -- one test each
  // (split 2026-09-28).
  const fillMismatch = async (p) => {
    await p.openChangePassword();
    await p.currentPasswordInput.fill(PWD);
    await p.newPasswordInput.fill('Kestrel#2026');
    await p.repeatPasswordInput.fill('Kestrel#2027');
    await p.repeatPasswordInput.blur();
  };

  test(
    'PRF-04-03: different New and Repeat passwords show a mismatch message',
    { tag: ['@negative'] },
    async ({ app }) => {
      await fillMismatch(app.profile);
      await expect(app.profile.changePasswordForm).toContainText(/match/i);
    }
  );

  test(
    'PRF-04-10: with different New and Repeat passwords, Save stays blocked',
    { tag: ['@negative'] },
    async ({ app }) => {
      await fillMismatch(app.profile);
      await expect(app.profile.changePasswordSaveBtn).toBeDisabled();
    }
  );

  // A wrong current password: the server rejects it (PRF-04-04), and the teacher sees a clear error (PRF-04-11) -- one
  // test each (split 2026-09-28).
  // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232): with all three fields filled and Save enabled, pressing Save
  // (the click lands on the button, the keyboard and spinner out of the way) sends no request, shows no message and leaves
  // the form open -- the password cannot be changed from the profile.
  const SAVE_DOES_NOTHING = 'Change Password Save does nothing (no request, no message)';

  test(
    'PRF-04-04: a wrong current password is rejected by the server, so the password stays the same',
    { tag: ['@bug', '@negative'] },
    async ({ app }) => {
      test.fail(true, SAVE_DOES_NOTHING);
      const p = app.profile;
      await p.openChangePassword();
      const reply = await p.changePassword(`${PWD}-wrong`, 'Kestrel#2026');
      expect(reply.ok(), 'server rejects the wrong current password').toBe(false);
    }
  );

  test(
    'PRF-04-11: a wrong current password shows the teacher a clear error',
    { tag: ['@bug', '@negative'] },
    async ({ app }) => {
      test.fail(true, SAVE_DOES_NOTHING);
      const p = app.profile;
      await p.openChangePassword();
      await p.changePassword(`${PWD}-wrong`, 'Kestrel#2026').catch(() => null);
      await expect(p.errorText.or(p.snackbar).first(), 'a clear error').toBeVisible({ timeout: 10000 });
    }
  );

  test(
    'PRF-04-05: a new password identical to the current one is rejected',
    { tag: ['@negative'] },
    async ({ app }) => {
      const p = app.profile;
      await p.openChangePassword();
      await p.currentPasswordInput.fill(PWD);
      await p.newPasswordInput.fill(PWD);
      await p.repeatPasswordInput.fill(PWD);
      if (await p.changePasswordSaveBtn.isEnabled()) {
        const res = p.page
          .waitForResponse((r) => /password/i.test(r.url()) && r.request().method() !== 'GET', { timeout: 15000 })
          .catch(() => null);
        await p.changePasswordSaveBtn.click();
        const r = await res;
        if (r) expect(r.ok(), 'server rejects an unchanged password').toBe(false);
        await expect(p.errorText.or(p.snackbar).first(), 'a clear message').toBeVisible({ timeout: 10000 });
      } else {
        await expect(p.changePasswordForm, 'the form explains why').toContainText(/same|different|current/i);
      }
    }
  );

  test('PRF-04-06: Cancel closes the form without changing anything', { tag: ['@functional'] }, async ({ app }) => {
    const p = app.profile;
    await p.openChangePassword();
    await p.currentPasswordInput.fill(PWD);
    await p.newPasswordInput.fill('Kestrel#2026');
    await p.changePasswordCancelBtn.click();
    await expect(p.changePasswordForm).toBeHidden();
    await expect(p.openChangePasswordLink).toBeVisible();
    // Unchanged: the original password still signs in.
    await app.userMenu.signOut();
    await app.login.signInWithPassword({ schoolSearchTerm: SCHOOL, username: USER, password: PWD });
    await expect(app.login.avatar).toBeVisible({ timeout: 20000 });
  });

  // After a successful change: the new password signs in (PRF-04-07), and the old one is rejected (PRF-04-12) -- one
  // test each (split 2026-09-28). Each changes the spare account's password, signs out, runs its check, then puts the
  // original password back.
  const withChangedPassword = async (app, check) => {
    const p = app.profile;
    const next = `Kestrel#${Date.now() % 100000}`;
    await p.openChangePassword();
    expect((await p.changePassword(PWD, next)).ok(), 'set-up: password changed').toBe(true);
    let current = next;
    try {
      await app.userMenu.signOut().catch(() => {});
      await check(next);
    } finally {
      // Put the original password back.
      await app.login.avatar
        .isVisible()
        .then((v) =>
          v ? null : app.login.signInWithPassword({ schoolSearchTerm: SCHOOL, username: USER, password: next })
        )
        .catch(() => {});
      await p.openChangePassword().catch(() => {});
      const back = await p.changePassword(next, PWD).catch(() => null);
      if (back && back.ok()) current = PWD;
      test.info().annotations.push({
        type: 'credential',
        description: `Spare account password is now: ${current === PWD ? 'the original (restored)' : next}`,
      });
      if (current !== PWD)
        console.error(
          `${test.info().title.slice(0, 9)}: could not restore the spare account password; it is now "${next}". Update DISPOSABLE_PASSWORD in .env.`
        );
    }
    expect(current, 'original password restored').toBe(PWD);
  };

  test(
    'PRF-04-07: after a successful password change, the new password signs in',
    { tag: ['@bug', '@functional'] },
    async ({ app }) => {
      test.fail(true, SAVE_DOES_NOTHING);
      test.setTimeout(240000);
      await withChangedPassword(app, async (next) => {
        await app.login.signInWithPassword({ schoolSearchTerm: SCHOOL, username: USER, password: next });
        await expect(app.login.avatar, 'new password signs in').toBeVisible({ timeout: 20000 });
      });
    }
  );

  test(
    'PRF-04-12: after a successful password change, the old password is rejected',
    { tag: ['@bug', '@functional'] },
    async ({ app }) => {
      test.fail(true, SAVE_DOES_NOTHING);
      test.setTimeout(240000);
      await withChangedPassword(app, async () => {
        await app.login.signInWithPassword({ schoolSearchTerm: SCHOOL, username: USER, password: PWD });
        await expect(app.login.passwordErrorMessage, 'old password rejected').toBeVisible({ timeout: 15000 });
      });
    }
  );

  test(
    'PRF-04-08: Change Password and Change PIN cannot both be open at once (regression)',
    { tag: ['@regression'] },
    async ({ app }) => {
      const p = app.profile;
      await p.openChangePassword();
      const pinLinkUsable = await p.openChangePinLink.isVisible().catch(() => false);
      if (pinLinkUsable) await p.openChangePinLink.click({ force: true });
      await app.page.waitForTimeout(800);
      const bothOpen =
        (await p.changePasswordForm.isVisible()) &&
        (await p
          .newPinBox(0)
          .isVisible()
          .catch(() => false));
      expect(bothOpen, 'never both forms at once').toBe(false);
    }
  );
});

test.describe('PRF-05 Change PIN', () => {
  const otherPin = () => (PIN === '24680' ? '13579' : '24680');

  test(
    'PRF-05-01: Change PIN shows Current, New and Repeat boxes, Auto-Generate, Cancel and Save',
    { tag: ['@functional'] },
    async ({ app }) => {
      const p = app.profile;
      await p.openChangePin();
      for (const box of [p.currentPinBox, p.newPinBox, p.repeatPinBox]) await expect(box(0)).toBeVisible();
      await expect(p.pinAutoGenerateLink).toBeVisible();
      await expect(p.changePinCancelBtn).toBeVisible();
      await expect(p.changePinSaveBtn).toBeVisible();
    }
  );

  test('PRF-05-02: the PIN boxes accept digits only', { tag: ['@negative'] }, async ({ app }) => {
    const p = app.profile;
    await p.openChangePin();
    await p.newPinBox(0).click();
    await app.page.keyboard.type('a');
    await expect(p.newPinBox(0)).toHaveValue('');
    await p.newPinBox(0).click();
    await app.page.keyboard.type('7');
    await expect(p.newPinBox(0)).toHaveValue('7');
  });

  test('PRF-05-03: Auto-Generate PIN fills in the New PIN', { tag: ['@functional'] }, async ({ app }) => {
    const p = app.profile;
    await p.openChangePin();
    await p.pinAutoGenerateLink.click();
    await expect.poll(() => p.readPin(p.newPinBox), { message: 'New PIN filled with 5 digits' }).toMatch(/^\d{5}$/);
  });

  test('PRF-05-04: different New and Repeat PINs block Save', { tag: ['@negative'] }, async ({ app }) => {
    const p = app.profile;
    await p.openChangePin();
    await p.fillPin(p.currentPinBox, PIN);
    await p.fillPin(p.newPinBox, '24680');
    await p.fillPin(p.repeatPinBox, '24681');
    await expect(p.changePinSaveBtn).toBeDisabled();
  });

  test(
    'PRF-05-05: a new PIN identical to the current one is rejected with a clear message',
    { tag: ['@bug', '@negative'] },
    async ({ app }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232): saving a new PIN identical to the current one shows no message
      // at all (no rejection, no confirmation).
      test.fail(true, 'Saving a new PIN identical to the current one shows no message');
      const p = app.profile;
      await p.openChangePin();
      await p.fillPin(p.currentPinBox, PIN);
      await p.fillPin(p.newPinBox, PIN);
      await p.fillPin(p.repeatPinBox, PIN);
      if (await p.changePinSaveBtn.isEnabled()) {
        await p.changePinSaveBtn.click();
        await expect(p.errorText.or(p.snackbar).first(), 'a clear message').toContainText(
          /same|different|current|\w{4,}/i,
          { timeout: 10000 }
        );
        // And the PIN is unchanged: still signs in.
        await app.userMenu.signOut().catch(() => {});
        await app.signIn(PIN);
      } else {
        await expect(p.errorText.first(), 'the form explains why').toBeVisible();
      }
    }
  );

  test('PRF-05-06: Cancel closes the form without changing the PIN', { tag: ['@functional'] }, async ({ app }) => {
    const p = app.profile;
    await p.openChangePin();
    await p.fillPin(p.currentPinBox, PIN);
    await p.fillPin(p.newPinBox, otherPin());
    await p.changePinCancelBtn.click();
    await expect(p.newPinBox(0)).toBeHidden();
    await app.userMenu.signOut();
    await app.signIn(PIN); // throws if the PIN had changed
    await expect(app.login.avatar).toBeVisible();
  });

  // After a successful change: the new PIN signs in (PRF-05-07), and the old one is rejected (PRF-05-08) -- one test each
  // (split 2026-09-28). Each changes the spare account's PIN, signs out, runs its check, then puts the original PIN back.
  const withChangedPin = async (app, check) => {
    const p = app.profile;
    const next = otherPin();
    await p.openChangePin();
    expect((await p.changePin(PIN, next)).ok(), 'set-up: PIN changed').toBe(true);
    let current = next;
    try {
      await app.userMenu.signOut().catch(() => {});
      await app.login.page.goto('./');
      await check(next);
    } finally {
      if (!(await app.login.avatar.isVisible().catch(() => false))) await app.signIn(next).catch(() => {});
      await p.openChangePin().catch(() => {});
      const back = await p.changePin(next, PIN).catch(() => null);
      if (back && back.ok()) current = PIN;
      test.info().annotations.push({
        type: 'credential',
        description: `Spare account PIN is now: ${current === PIN ? 'the original (restored)' : next}`,
      });
      if (current !== PIN)
        console.error(
          `${test.info().title.slice(0, 9)}: could not restore the spare account PIN; it is now ${next}. Update DISPOSABLE_PIN in .env.`
        );
    }
    expect(current, 'original PIN restored').toBe(PIN);
  };

  test('PRF-05-07: after a successful PIN change, the new PIN signs in', { tag: ['@functional'] }, async ({ app }) => {
    test.setTimeout(240000);
    await withChangedPin(app, async (next) => {
      await app.signIn(next);
      await expect(app.login.avatar, 'new PIN signs in').toBeVisible();
    });
  });

  test(
    'PRF-05-08: after a successful PIN change, the old PIN is rejected',
    { tag: ['@functional'] },
    async ({ app }) => {
      test.setTimeout(240000);
      await withChangedPin(app, async () => {
        await app.login.openSignIn();
        await app.login.enterPin(PIN);
        await expect(app.login.pinErrorMessage, 'old PIN rejected').toBeVisible({ timeout: 15000 });
      });
    }
  );
});
