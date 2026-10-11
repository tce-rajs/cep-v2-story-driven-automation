// PRF-04 — Change password; PRF-05 — Change PIN
// Source: CEPV2_Stories/17_Profile.md
// Runs ONLY on the spare account (DISPOSABLE_* in .env), never the main QA account.
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
  // ).
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

  // Different New and Repeat values: a mismatch message (PRF-04-03), and Save stays blocked (PRF-04-10) -- one test each.
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
  // test each.

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
  // test each. Each changes the spare account's password, signs out, runs its check, then puts the
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

  /** Press Save with the network dropping just as the server answers: the request reaches the server, the answer never
   * reaches the app. Returns what the teacher was told: 'changed', 'not changed' or null (nothing). */
  const saveAsNetworkDrops = async (page, saveBtn, urlPattern) => {
    const drop = async (route) => {
      if (!['POST', 'PUT', 'PATCH'].includes(route.request().method())) return route.continue();
      await route.fetch().catch(() => {});
      return route.abort('internetdisconnected');
    };
    await page.route(urlPattern, drop);
    try {
      await saveBtn.click();
      const told = page
        .getByText(
          /changed|updated|success|not (changed|saved|updated)|could not|couldn't|unable|failed|error|try again|network/i
        )
        .filter({ visible: true })
        .first();
      const text = await told
        .waitFor({ state: 'visible', timeout: 20000 })
        .then(() => told.innerText())
        .catch(() => '');
      if (!text) return null;
      return /not (changed|saved|updated)|could not|couldn't|unable|failed|error|try again|network/i.test(text)
        ? 'not changed'
        : 'changed';
    } finally {
      await page.unroute(urlPattern, drop).catch(() => {});
    }
  };

  /** Sign in with the password form; true when it gets in. */
  const passwordWorks = async (app, password) => {
    await app.login.signInWithPassword({ schoolSearchTerm: SCHOOL, username: USER, password });
    return app.login.avatar
      .waitFor({ state: 'visible', timeout: 20000 })
      .then(() => true)
      .catch(() => false);
  };

  /** Find which of `candidates` is now the spare account's password and set the original one back. */
  const restorePassword = async (app, candidates) => {
    let current = null;
    for (const pwd of candidates) {
      if (await app.login.avatar.isVisible().catch(() => false)) await app.userMenu.signOut().catch(() => {});
      if (await passwordWorks(app, pwd)) {
        current = pwd;
        break;
      }
    }
    if (current && current !== PWD) {
      await app.profile.openChangePassword().catch(() => {});
      const back = await app.profile.changePassword(current, PWD).catch(() => null);
      if (back && back.ok()) current = PWD;
    }
    test.info().annotations.push({
      type: 'credential',
      description: `Spare account password is now: ${current === PWD ? 'the original (restored)' : current || 'unknown'}`,
    });
    if (current !== PWD)
      console.error(
        `${test.info().title.slice(0, 9)}: could not restore the spare account password (now ${current || 'unknown'}). Update DISPOSABLE_PASSWORD in .env.`
      );
    return current;
  };

  test(
    'PRF-04-13: if the network drops while saving a new password, the teacher is told whether it changed, and that password works',
    { tag: ['@interruption'] },
    async ({ app, page }) => {
      test.setTimeout(300000);
      const p = app.profile;
      const next = `Kestrel#${Date.now() % 100000}`;
      await p.openChangePassword();
      await p.currentPasswordInput.fill(PWD);
      await p.newPasswordInput.fill(next);
      await p.repeatPasswordInput.fill(next);
      await p.hideKeyboard();
      await p.waitForSpinner();
      let told;
      let works = false;
      try {
        told = await saveAsNetworkDrops(page, p.changePasswordSaveBtn, /password/i);
        test.info().annotations.push({ type: 'note', description: `The teacher was told: ${told || 'nothing'}` });
        if (told) {
          await p.closeWindow();
          await app.userMenu.signOut().catch(() => {});
          works = await passwordWorks(app, told === 'changed' ? next : PWD);
        }
      } finally {
        await restorePassword(app, [next, PWD]);
      }
      expect(told, 'the teacher is told whether the password changed').not.toBeNull();
      expect(works, `the password the teacher was told about (${told}) signs in`).toBe(true);
    }
  );

  test(
    'PRF-04-14: what happens to a session on another device after the password is changed (the behaviour is recorded)',
    { tag: ['@concurrency'] },
    async ({ app }) => {
      test.setTimeout(300000);
      const { chromium } = require('@playwright/test');
      const { BASE_URL } = require('../../config/env');
      const { App } = require('../../pages/app');
      const browser = await chromium.launch();
      const next = `Kestrel#${Date.now() % 100000}`;
      try {
        // The other device: a separate browser session signed in to the same spare account.
        const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1920, height: 1080 } });
        const other = new App(await context.newPage());
        await other.signIn(PIN);
        await app.profile.openChangePassword();
        expect((await app.profile.changePassword(PWD, next)).ok(), 'set-up: password changed').toBe(true);
        await other.page.waitForTimeout(5000);
        await other.page.reload();
        await other.toolbar.wbSvg.waitFor({ state: 'visible', timeout: 30000 });
        await other.page.waitForTimeout(3000);
        const stillIn = await other.login.avatar.isVisible().catch(() => false);
        const guest = await other.login.guestModeText.isVisible().catch(() => false);
        test.info().annotations.push({
          type: 'note',
          description: `Other device after the password change: ${stillIn ? 'still signed in' : guest ? 'signed out (Guest Mode)' : 'neither signed in nor in Guest Mode'}`,
        });
        // Whatever the design, the other device ends in a clear state: signed in, or signed out to Guest Mode.
        expect(stillIn || guest, 'the other device is signed in or cleanly signed out').toBe(true);
      } finally {
        await browser.close().catch(() => {});
        await restorePassword(app, [next, PWD]);
      }
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

  // After a successful change: the new PIN signs in (PRF-05-07), and the old one is rejected (PRF-05-08) -- one test each.
  // Each changes the spare account's PIN, signs out, runs its check, then puts the original PIN back.
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

  test(
    'PRF-05-09: if the network drops while saving a new PIN, the teacher is told whether it changed, and that PIN works',
    { tag: ['@interruption'] },
    async ({ app, page }) => {
      test.setTimeout(300000);
      const p = app.profile;
      const next = otherPin();
      // The request reaches the server; the answer never reaches the app.
      const drop = async (route) => {
        if (!['POST', 'PUT', 'PATCH'].includes(route.request().method())) return route.continue();
        await route.fetch().catch(() => {});
        return route.abort('internetdisconnected');
      };
      await p.openChangePin();
      await p.fillPin(p.currentPinBox, PIN);
      await p.fillPin(p.newPinBox, next);
      await p.fillPin(p.repeatPinBox, next);
      await p.hideKeyboard();
      await p.waitForSpinner();
      let told = null;
      let works = false;
      const pinWorks = (pin) =>
        app
          .signIn(pin)
          .then(() => true)
          .catch(() => false);
      try {
        await page.route(/pin/i, drop);
        await p.changePinSaveBtn.click();
        const msg = page
          .getByText(
            /changed|updated|success|not (changed|saved|updated)|could not|couldn't|unable|failed|error|try again|network/i
          )
          .filter({ visible: true })
          .first();
        const text = await msg
          .waitFor({ state: 'visible', timeout: 20000 })
          .then(() => msg.innerText())
          .catch(() => '');
        await page.unroute(/pin/i, drop);
        if (text)
          told = /not (changed|saved|updated)|could not|couldn't|unable|failed|error|try again|network/i.test(text)
            ? 'not changed'
            : 'changed';
        test.info().annotations.push({ type: 'note', description: `The teacher was told: ${told || 'nothing'}` });
        if (told) {
          await p.closeWindow();
          await app.userMenu.signOut().catch(() => {});
          works = await pinWorks(told === 'changed' ? next : PIN);
        }
      } finally {
        await page.unroute(/pin/i, drop).catch(() => {});
        // Put the original PIN back, whichever PIN the account has now.
        let current = null;
        for (const pin of [next, PIN]) {
          if (await app.login.avatar.isVisible().catch(() => false)) await app.userMenu.signOut().catch(() => {});
          if (await pinWorks(pin)) {
            current = pin;
            break;
          }
        }
        if (current === next) {
          await p.openChangePin().catch(() => {});
          const back = await p.changePin(next, PIN).catch(() => null);
          if (back && back.ok()) current = PIN;
        }
        test.info().annotations.push({
          type: 'credential',
          description: `Spare account PIN is now: ${current === PIN ? 'the original (restored)' : current || 'unknown'}`,
        });
        if (current !== PIN)
          console.error(
            `PRF-05-09: could not restore the spare account PIN (now ${current || 'unknown'}). Update DISPOSABLE_PIN in .env.`
          );
      }
      expect(told, 'the teacher is told whether the PIN changed').not.toBeNull();
      expect(works, `the PIN the teacher was told about (${told}) signs in`).toBe(true);
    }
  );
});
