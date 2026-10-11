// FLOW-20 — The teacher's profile changes how ClassEdge works for them
// Source: CEPV2_Stories/00_EndToEndFlows.md
// Everything that changes the profile runs ONLY on the spare account (DISPOSABLE_* in .env): preferred types and
// subjects are put back, password and PIN are set back to the originals at the end. A new PIN is picked per run
// (PINs are unique across the school). FLOW-20-01 only reads the main teacher's profile.

const { test, expect } = require('../../fixtures');
const { newPin, findTopicWhere } = require('./flow-helpers');

const PWD = process.env.DISPOSABLE_PASSWORD;
const PIN = process.env.DISPOSABLE_PIN;
const USER = process.env.DISPOSABLE_USERNAME;
const SCHOOL = process.env.DISPOSABLE_SCHOOL_SEARCH_TERM || process.env.SCHOOL_SEARCH_TERM;
const spare = () => test.skip(!PWD || !PIN || !USER, 'needs the spare account (DISPOSABLE_* in .env)');
const signInWithPassword = (app, password) =>
  app.login.signInWithPassword({ schoolSearchTerm: SCHOOL, username: USER, password });

// Preferred type name -> the type icon its Playlist cards carry.
const TYPE_ICONS = {
  Video: /video/i,
  Worksheet: /worksheet/i,
  Image: /image/i,
  Audio: /audio/i,
  Interactivity: /interactiv/i,
};

test.describe('FLOW-20 The teacher’s profile changes how ClassEdge works for them', () => {
  test.describe.configure({ timeout: 300000 });

  test.afterEach(async ({ app }) => {
    await app.profile.subjectMenuCloseBtn.click({ force: true, timeout: 1500 }).catch(() => {});
    await app.profile.closeWindow().catch(() => {});
  });

  test("FLOW-20-01: the profile shows the teacher's details", { tag: ['@smoke', '@functional'] }, async ({ user }) => {
    await user.userMenu.openProfileMenu();
    await expect(user.userMenu.signedInAsRow, 'who is signed in').toContainText(/signed in as\s*\S+/i);
    await user.page.keyboard.press('Escape');
    const p = user.profile;
    await p.open();
    await expect(p.preferredResourceTypeDropdown, 'the preferred resource types').toContainText(
      /video|worksheet|audio|image|interactivity|learning shorts/i
    );
    expect((await p.subjectNames()).length, 'the teaching subjects').toBeGreaterThan(0);
  });

  test(
    'FLOW-20-02: changing preferred resource types changes the playlist',
    { tag: ['@functional'] },
    async ({ app }) => {
      spare();
      await app.signIn(PIN);
      const p = app.profile;
      await p.open();
      const prefs = await p.preferredResourceTypeDropdown.innerText();
      await p.closeWindow();
      const candidates = Object.keys(TYPE_ICONS).filter((t) => new RegExp(t, 'i').test(prefs));
      // A topic whose Playlist shows one of the preferred types.
      let type = null;
      const found = await findTopicWhere(app, async () => {
        const icons = await app.playlist.cardTypes();
        type = candidates.find((t) => icons.some((src) => TYPE_ICONS[t].test(src || ''))) || null;
        return !!type;
      });
      if (!found)
        throw new Error(
          `DATA MISSING ON THIS SERVER: no topic of the spare account shows a preferred type (${candidates.join(', ')})`
        );
      const ofType = async () =>
        (await app.playlist.cardTypes()).filter((src) => TYPE_ICONS[type].test(src || '')).length;
      expect(await ofType(), `set-up: ${type} resources are shown`).toBeGreaterThan(0);

      await p.open();
      await p.preferredResourceTypeDropdown.click({ force: true });
      await p.removeFilter(type);
      await p.applyFilterBtn.click({ force: true }).catch(() => {});
      await p.waitForSpinner();
      await p.closeWindow();
      try {
        await app.page.reload();
        await app.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
        await app.playlist.ensureDrawerVisible();
        await expect.poll(ofType, { message: `${type} is no longer shown in the playlist`, timeout: 15000 }).toBe(0);
      } finally {
        // Put the type back.
        await p.open().catch(() => {});
        await p.preferredResourceTypeDropdown.click({ force: true }).catch(() => {});
        if (!new RegExp(type, 'i').test(await p.preferredResourceTypeDropdown.innerText().catch(() => type))) {
          await p.filterOptions
            .filter({ hasText: type })
            .first()
            .click({ force: true })
            .catch(() => {});
          await p.applyFilterBtn.click({ force: true }).catch(() => {});
        }
        await p.closeWindow().catch(() => {});
      }
    }
  );

  test(
    'FLOW-20-03: changing teaching subjects changes the subjects offered in class navigation',
    { tag: ['@functional'] },
    async ({ app }) => {
      spare();
      await app.signIn(PIN);
      const p = app.profile;
      await p.open();
      await p.waitForSpinner();
      await p.addSubjectsBtn.click();
      await expect(p.subjectPickerOptions.first(), 'set-up: a subject can be added').toBeVisible({ timeout: 10000 });
      const option = p.subjectPickerOptions.first();
      const subject = (await option.getAttribute('data-qa-id')).replace('user-profile-subject-add-', '');
      await option.click({ force: true });
      await p.subjectMenuCloseBtn.click({ force: true, timeout: 2000 }).catch(() => {});
      await expect(p.subjectChipRemove(subject), `set-up: ${subject} added`).toBeVisible({ timeout: 10000 });
      await p.closeWindow();
      try {
        // Every subject the class chooser offers, across the teacher's grades and divisions.
        const nav = app.nav;
        await nav._openUntil(nav.currentClassBtn, nav.allMyClassesTab);
        await app.page.waitForTimeout(800);
        await nav.allMyClassesTab.click();
        const offered = new Set();
        for (let g = 0; g < (await nav.gradeButtons.count()); g++) {
          await nav.gradeButtons.nth(g).click();
          await app.page.waitForTimeout(400);
          for (let d = 0; d < (await nav.divisionButtons.count()); d++) {
            await nav.divisionButtons.nth(d).click();
            await app.page.waitForTimeout(400);
            for (const s of await nav.subjectButtons.allInnerTexts()) offered.add(s.trim().toLowerCase());
          }
        }
        await nav.currentClassBtn.click().catch(() => {});
        expect([...offered], `${subject} is offered in class navigation`).toContain(subject.trim().toLowerCase());
      } finally {
        await p.open().catch(() => {});
        await p.removeSubject(subject).catch(() => {});
        await p.closeWindow().catch(() => {});
      }
    }
  );

  test(
    'FLOW-20-04: a changed password signs in, and the old one does not',
    { tag: ['@functional'] },
    async ({ app }) => {
      spare();
      await app.signIn(PIN);
      const p = app.profile;
      const next = `Kestrel#${Date.now() % 100000}`;
      await p.openChangePassword();
      expect((await p.changePassword(PWD, next)).ok(), 'set-up: the password is changed').toBe(true);
      let current = next;
      try {
        await app.userMenu.signOut().catch(() => {});
        await signInWithPassword(app, PWD);
        await expect(app.login.passwordErrorMessage, 'the old password is refused').toBeVisible({ timeout: 15000 });
        await expect(app.login.avatar).toBeHidden();
        await signInWithPassword(app, next);
        await expect(app.login.avatar, 'the new password signs in').toBeVisible({ timeout: 20000 });
      } finally {
        if (!(await app.login.avatar.isVisible().catch(() => false)))
          await signInWithPassword(app, next).catch(() => {});
        await p.openChangePassword().catch(() => {});
        const back = await p.changePassword(next, PWD).catch(() => null);
        if (back && back.ok()) current = PWD;
        test.info().annotations.push({
          type: 'credential',
          description: `Spare account password is now: ${current === PWD ? 'the original (restored)' : next}`,
        });
      }
      expect(current, 'original password restored').toBe(PWD);
    }
  );

  test('FLOW-20-05: a changed PIN signs in, and the old one does not', { tag: ['@functional'] }, async ({ app }) => {
    spare();
    await app.signIn(PIN);
    const p = app.profile;
    // A PIN nobody holds: PINs are unique across the school, so a taken one is refused -- then another is tried.
    let next = null;
    for (let i = 0; i < 3 && !next; i++) {
      const candidate = newPin(PIN);
      await p.openChangePin();
      if ((await p.changePin(PIN, candidate)).ok()) next = candidate;
      else await p.closeWindow();
    }
    expect(next, 'set-up: the PIN is changed').toBeTruthy();
    let current = next;
    try {
      await app.userMenu.signOut().catch(() => {});
      await app.guest.open();
      await app.login.openSignIn();
      await app.login.enterPin(PIN);
      await expect(app.login.pinErrorMessage, 'the old PIN is refused').toBeVisible({ timeout: 15000 });
      await app.signIn(next);
      await expect(app.login.avatar, 'the new PIN signs in').toBeVisible();
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
        console.error(`FLOW-20-05: the spare account PIN is now ${next}. Update DISPOSABLE_PIN in .env.`);
    }
    expect(current, 'original PIN restored').toBe(PIN);
  });

  test(
    'FLOW-20-06: a new password that breaks the rules is refused with a message',
    { tag: ['@negative'] },
    async ({ app, page }) => {
      spare();
      await app.signIn(PIN);
      const p = app.profile;
      await p.openChangePassword();
      const changes = [];
      page.on(
        'response',
        (r) =>
          ['POST', 'PUT', 'PATCH'].includes(r.request().method()) &&
          /password/i.test(r.url()) &&
          r.ok() &&
          changes.push(r.url())
      );
      await p.currentPasswordInput.fill(PWD);
      await p.newPasswordInput.fill('abc');
      await p.repeatPasswordInput.fill('abc');
      await p.hideKeyboard();
      await p.waitForSpinner();
      if (await p.changePasswordSaveBtn.isEnabled().catch(() => false)) await p.changePasswordSaveBtn.click();
      await page.waitForTimeout(3000);
      try {
        await expect(p.errorText.or(p.snackbar).first(), 'a message about the password rules').toBeVisible({
          timeout: 5000,
        });
        expect(changes, 'the password is not changed').toEqual([]);
      } finally {
        // If the weak password was accepted after all, set the original back.
        if (changes.length) {
          await p.closeWindow().catch(() => {});
          await p.openChangePassword().catch(() => {});
          await p.changePassword('abc', PWD).catch(() => {});
        }
      }
    }
  );
});
