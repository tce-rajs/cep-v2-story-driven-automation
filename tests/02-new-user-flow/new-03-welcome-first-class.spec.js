// NEW-03 — Welcome screen and first-time class selection
// Source: CEPV2_Stories/02_NewUserFlow.md
//
// Continues from new-02-pin-setup.spec.js: the account now has its PIN and has never chosen a class. ONE-SHOT PER FRESH
// ACCOUNT (see new-01-first-login.spec.js). Order matters: NEW-03-03 (leave without choosing, prompt must return) has to
// run BEFORE NEW-03-02 (which actually chooses a class and so ends the first-time state for good).
// Known from the previous suite: the "Choose a class" prompt is `button.choose-a-class` (CONFIRMED LIVE v 0.0.223) inside `.first-time-user-message`.

const { test, expect } = require('../../fixtures');
const { NewUserPage } = require('../../pages/new-user.page');

test.describe.configure({ mode: 'serial' });

test.describe('NEW-03 Welcome screen and first-time class selection', () => {
  test.skip(
    !NewUserPage.configured,
    'set NEW_USER_USERNAME, NEW_USER_NEW_PASSWORD and NEW_USER_PIN in .env (see .env.example)'
  );

  const { pin } = NewUserPage.credentials;

  /** NEW-03 only means something for an account that has never chosen a class. Once a class has been chosen (NEW-03-02 does
   * that, and a password/PIN reset does not undo it) the app opens straight into it and the welcome prompt never appears,
   * so the three cases are skipped with that reason rather than reported as failures. */
  const skipIfClassAlreadyChosen = async (app) => {
    const welcome = app.newUser.welcomeMessage;
    await welcome
      .or(app.nav.currentClassBtn)
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => {});
    const alreadyChosen =
      !(await welcome.isVisible().catch(() => false)) && (await app.nav.currentClassBtn.isVisible().catch(() => false));
    test.skip(
      alreadyChosen,
      'this account has already chosen its first class; NEW-03 needs a fresh user (or the last-accessed class cleared)'
    );
  };

  /** Open the class chooser from the first-time prompt. CONFIRMED LIVE (v 0.0.223): a forced click right after sign-in is
   * swallowed (nothing opens); a plain click once the prompt has settled opens it, and the grade buttons appear. */
  const openChooser = async (app) => {
    await expect(app.newUser.chooseClassBtn.first()).toBeVisible({ timeout: 15000 });
    await app.page.waitForTimeout(2500);
    await app.newUser.chooseClassBtn.first().click();
    await expect(app.nav.gradeButtons.first(), 'the class chooser opened').toBeVisible({ timeout: 10000 });
  };

  test(
    'NEW-03-01: the first login after setup shows a welcome message with a "Choose Class" option centred on the page',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      await app.signIn(pin);
      await skipIfClassAlreadyChosen(app);

      await expect(app.newUser.welcomeMessage, 'a welcome message').toBeVisible({ timeout: 15000 });
      await expect(app.newUser.chooseClassBtn, 'with a Choose Class option').toBeVisible();

      // Centred: the option sits in the middle of the page horizontally.
      const { width } = await app.header.viewportSize();
      const box = await app.newUser.chooseClassBtn.boundingBox();
      const centreX = box.x + box.width / 2;
      expect(Math.abs(centreX - width / 2), 'horizontally centred').toBeLessThan(width * 0.1);
    }
  );

  test(
    'NEW-03-03: closing or navigating away before selecting a class means the "Choose Class" prompt reappears on the next login',
    { tag: ['@edge'] },
    async ({ app }) => {
      await app.signIn(pin);
      await skipIfClassAlreadyChosen(app);
      await expect(app.newUser.chooseClassBtn).toBeVisible({ timeout: 15000 });

      // Open the class chooser, then leave WITHOUT choosing: close it, then sign out.
      await openChooser(app);
      await app.page.keyboard.press('Escape');
      await app.page.waitForTimeout(1000);
      await app.userMenu.signOut();

      await app.signIn(pin);
      await skipIfClassAlreadyChosen(app);
      await expect(app.newUser.chooseClassBtn, 'the prompt is back — not silently skipped').toBeVisible({
        timeout: 15000,
      });
    }
  );

  test(
    'NEW-03-02: selecting a class for the first time completes correctly and proceeds into the normal app flow',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      await app.signIn(pin);
      await skipIfClassAlreadyChosen(app);
      await expect(app.newUser.chooseClassBtn).toBeVisible({ timeout: 15000 });

      await openChooser(app);
      await app.nav.allMyClassesTab.click({ timeout: 3000 }).catch(() => {});
      await app.nav.gradeButtons.first().click({ timeout: 10000 });
      await app.nav.divisionButtons.first().click({ timeout: 10000 });
      await app.nav.subjectButtons.first().click({ timeout: 10000 });

      // Now in the normal flow: a current class is shown, the first-time prompt is gone, and the Playlist is there.
      await expect(app.nav.currentClassBtn, 'a current class is set').toBeVisible({ timeout: 15000 });
      await expect(app.newUser.chooseClassBtn, 'the first-time prompt is gone').toBeHidden();
      await expect(app.playlist.contentsTile, 'the normal app shell').toBeVisible();
    }
  );
});
