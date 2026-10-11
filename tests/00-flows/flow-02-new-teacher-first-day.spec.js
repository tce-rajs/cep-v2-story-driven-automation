// FLOW-02 — A new teacher's first day (Admin to classroom)
// Source: CEPV2_Stories/00_EndToEndFlows.md
//
// EACH RUN NEEDS A FRESH TEACHER. The account is the "AutoQA <stamp>" teacher the Admin suite creates in the Admin
// panel (FLOW-23 / tests/22): it must never have signed in, so it is still on the default first-login password
// `classedge`. Put it in .env before the run:
//   NEW_USER_USERNAME      the new teacher's user name (e.g. autoqa.xafl)
//   NEW_USER_NEW_PASSWORD  the password to set at the forced first-login step
//   NEW_USER_PIN           a 5-digit PIN to set. PINs are unique across the whole school, so use a NEW one each run
//                          (a PIN another teacher holds is refused with "Pin is already taken").
// The steps really change that account (default password -> new password -> PIN -> first class), so the tests run in
// order as one journey and a run cannot be repeated on the same teacher. Module 02 (tests/02-new-user-flow) uses the
// same account: run one or the other against a given fresh teacher, not both.
//
// FLOW-02-01 and FLOW-02-07 read the Admin panel (a plain browser page, signed in as the school admin from .env):
// the teacher list and that teacher's Edit form are only read, nothing is saved.

const { chromium } = require('@playwright/test');
const { test, expect } = require('../../fixtures');
const { NewUserPage } = require('../../pages/new-user.page');

const ADMIN_URL = process.env.ADMIN_URL || 'http://172.18.2.85/admin/';
const { username, newPassword, pin } = NewUserPage.credentials;

test.describe.configure({ mode: 'serial', timeout: 240000 });

/** A browser signed in to the Admin panel (Organization Id is an autocomplete: type the start of the school name and
 * pick the suggestion). Returns { page, close }. */
async function adminSession() {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  try {
    await page.goto(ADMIN_URL, { waitUntil: 'load', timeout: 60000 });
    const inputs = page.locator('input:visible');
    await inputs.first().waitFor({ timeout: 30000 });
    await inputs.nth(0).click();
    await inputs.nth(0).pressSequentially(process.env.ADMIN_SCHOOL.slice(0, 8), { delay: 30 });
    await page
      .locator('ng-autocomplete li')
      .filter({ hasText: process.env.ADMIN_SCHOOL })
      .first()
      .click({ timeout: 15000 });
    await inputs.nth(1).fill(process.env.ADMIN_USERNAME);
    await inputs.nth(2).fill(process.env.ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page
      .getByText(/dashboard/i)
      .first()
      .waitFor({ timeout: 30000 });
  } catch (e) {
    await browser.close();
    throw e;
  }
  return { page, close: () => browser.close().catch(() => {}) };
}

/** Dashboard -> MANAGE -> Manage Teacher, searched down to the new teacher; returns that teacher's row. */
async function teacherRow(page) {
  await page
    .getByText(/^\s*MANAGE\s*$/i)
    .first()
    .click()
    .catch(() => {});
  await page
    .getByText(/Manage Teacher/i)
    .first()
    .click();
  const search = page.getByPlaceholder('Search').first();
  await search.waitFor({ timeout: 15000 });
  await search.fill(username);
  await page.waitForTimeout(2500);
  return page.locator('tr').filter({ hasText: username }).first();
}

test.describe('FLOW-02 A new teacher’s first day', () => {
  test.skip(
    !NewUserPage.configured,
    'needs a fresh AutoQA teacher from the Admin suite: set NEW_USER_USERNAME, NEW_USER_NEW_PASSWORD and a new NEW_USER_PIN in .env'
  );

  test(
    'FLOW-02-01: a teacher created in Admin appears in the teacher list as ACTIVE',
    { tag: ['@smoke', '@functional'] },
    async () => {
      test.skip(!process.env.ADMIN_USERNAME, 'needs the Admin account (ADMIN_* in .env)');
      const admin = await adminSession();
      try {
        const row = await teacherRow(admin.page);
        await expect(row, `${username} is in the teacher list`).toBeVisible({ timeout: 15000 });
        // Columns: Full Name | Username | Teacher Status | Login Status.
        const cells = (await row.locator('td').allInnerTexts()).map((t) => t.trim());
        expect(cells, 'Teacher Status is ACTIVE').toContain('ACTIVE');
      } finally {
        await admin.close();
      }
    }
  );

  test(
    'FLOW-02-02: the new teacher can sign in on the panel after the school syncs',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      await app.newUser.signInWithPassword(NewUserPage.defaultPassword);
      await expect(app.login.passwordErrorMessage, 'the panel knows the new teacher').toBeHidden({ timeout: 8000 });
      await expect(
        app.newUser.setPasswordHeading.or(app.login.avatar).first(),
        'the sign-in is accepted and moves on'
      ).toBeVisible({ timeout: 20000 });
    }
  );

  test(
    'FLOW-02-03: the first sign-in with the default password asks for a new password',
    { tag: ['@functional'] },
    async ({ app }) => {
      await app.newUser.signInWithPassword(NewUserPage.defaultPassword);
      await expect(app.newUser.setPasswordHeading, 'a "set new password" step').toBeVisible({ timeout: 20000 });
      await expect(app.login.avatar, 'not signed straight in').toBeHidden();
    }
  );

  test('FLOW-02-04: the new password cannot be the default password', { tag: ['@negative'] }, async ({ app, page }) => {
    await app.newUser.signInWithPassword(NewUserPage.defaultPassword);
    await expect(app.newUser.setPasswordHeading, 'set-up: the new password step').toBeVisible({ timeout: 20000 });
    await app.newUser.setNewPassword(NewUserPage.defaultPassword);
    await page.waitForTimeout(3000);
    await expect(app.login.avatar, 'not signed in').toBeHidden();
    // Refused: the step is still showing (with a message), or the default password still forces the step again.
    const stillOnStep = await app.newUser.setPasswordHeading.isVisible().catch(() => false);
    if (!stillOnStep) {
      await app.newUser.signInWithPassword(NewUserPage.defaultPassword);
      await expect(
        app.newUser.setPasswordHeading,
        'the default password was not accepted as the new one: it still asks for a new password'
      ).toBeVisible({ timeout: 20000 });
    }
  });

  test(
    'FLOW-02-05: a PIN is set up after the new password',
    { tag: ['@smoke', '@functional'] },
    async ({ app, page }) => {
      await app.newUser.signInWithPassword(NewUserPage.defaultPassword);
      await expect(app.newUser.setPasswordHeading, 'set-up: the new password step').toBeVisible({ timeout: 20000 });
      await app.newUser.setNewPassword(newPassword);
      // After the new password the panel returns to Sign In (known D4); sign in with the new password.
      await page.waitForTimeout(3000);
      if (
        !(await app.newUser.pinInputs
          .first()
          .isVisible()
          .catch(() => false))
      )
        await app.newUser.signInWithPassword(newPassword);
      await expect(app.newUser.pinInputs.first(), 'the PIN set-up step follows the new password').toBeVisible({
        timeout: 20000,
      });
      const saved = page.waitForResponse(
        (r) => ['POST', 'PUT'].includes(r.request().method()) && /user\/pin|\/pin\b/i.test(r.url()),
        { timeout: 30000 }
      );
      await app.newUser.enterPin(pin);
      await app.newUser.confirmPin(pin);
      const reply = await saved;
      expect(reply.ok(), `the PIN is saved (${reply.status()} ${(await reply.text()).slice(0, 120)})`).toBe(true);
      await expect(app.newUser.pinInputs.first(), 'the PIN step is done').toBeHidden({ timeout: 20000 });
    }
  );

  test(
    'FLOW-02-06: the welcome screen lets the teacher choose a class',
    { tag: ['@functional'] },
    async ({ app, page }) => {
      await app.guest.open();
      await app.login.signOutLeftoverFirstTimeSession(); // the PIN step can leave a half-finished first-time session
      await app.login.openSignIn();
      await app.login.enterPin(pin);
      await expect(app.newUser.welcomeMessage, 'the welcome screen').toBeVisible({ timeout: 20000 });
      await app.newUser.chooseClassBtn.first().click({ force: true });
      const nav = app.nav;
      await nav.allMyClassesTab.click({ timeout: 10000 }).catch(() => {}); // the first-class chooser may open straight on the class list
      await nav.gradeButtons.first().click({ timeout: 15000 });
      await page.waitForTimeout(400);
      await nav.divisionButtons.first().click({ timeout: 10000 });
      await page.waitForTimeout(400);
      const subject = (await nav.subjectButtons.first().innerText()).trim();
      await nav.subjectButtons.first().click({ timeout: 10000 });
      await expect(nav.currentClassBtn, 'the chosen class opens').toContainText(subject, { timeout: 30000 });
      await expect(app.newUser.welcomeMessage, 'the welcome screen is gone').toBeHidden();
    }
  );

  test(
    'FLOW-02-07: the chosen class shows the subjects given in Admin',
    { tag: ['@functional'] },
    async ({ app, page }) => {
      test.skip(!process.env.ADMIN_USERNAME, 'needs the Admin account (ADMIN_* in .env)');
      // The subjects the admin gave the teacher: the Edit form's Subjects field (read only, nothing saved).
      const admin = await adminSession();
      let given;
      try {
        const row = await teacherRow(admin.page);
        await expect(row, `set-up: ${username} is in the teacher list`).toBeVisible({ timeout: 15000 });
        await row.locator('td').last().locator('*').last().click({ force: true });
        await admin.page
          .getByText(/^\s*Edit\s*$/)
          .filter({ visible: true })
          .first()
          .click();
        const values = admin.page.locator(
          '[formcontrolname="subjects"] .ng-value-label, [formcontrolname="subjects"] .ng-value'
        );
        await values.first().waitFor({ timeout: 15000 });
        given = [...new Set((await values.allInnerTexts()).map((t) => t.replace(/×/g, '').trim()).filter(Boolean))];
      } finally {
        await admin.close();
      }
      expect(given.length, 'set-up: Admin lists the teacher’s subjects').toBeGreaterThan(0);

      await app.signIn(pin);
      await app.nav._openUntil(app.nav.currentClassBtn, app.nav.allMyClassesTab);
      await page.waitForTimeout(800);
      await app.nav.allMyClassesTab.click();
      const offered = new Set();
      const grades = await app.nav.gradeButtons.count();
      for (let g = 0; g < grades; g++) {
        await app.nav.gradeButtons.nth(g).click();
        await page.waitForTimeout(400);
        const divisions = await app.nav.divisionButtons.count();
        for (let d = 0; d < divisions; d++) {
          await app.nav.divisionButtons.nth(d).click();
          await page.waitForTimeout(400);
          for (const s of await app.nav.subjectButtons.allInnerTexts()) offered.add(s.trim());
        }
      }
      await page.keyboard.press('Escape');
      test.info().annotations.push({
        type: 'note',
        description: `Admin subjects: ${given.join(', ')}; offered on the panel: ${[...offered].join(', ')}`,
      });
      expect(
        [...offered].filter((s) => !given.some((a) => a.toLowerCase() === s.toLowerCase())),
        'the panel offers only the subjects given in Admin'
      ).toEqual([]);
    }
  );

  test(
    'FLOW-02-08: the next sign-in goes straight to the board with the PIN (no first-time steps again)',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      await app.signIn(pin);
      await expect(app.login.avatar, 'signed in with the PIN').toBeVisible();
      await expect(app.toolbar.wbSvg, 'on the board').toBeVisible();
      await expect(app.newUser.setPasswordHeading, 'no new password step').toBeHidden();
      await expect(app.newUser.pinInputs, 'no PIN set-up step').toHaveCount(0);
      await expect(app.newUser.welcomeMessage, 'no welcome / first class screen').toBeHidden();
    }
  );
});
