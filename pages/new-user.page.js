// Page Object for the first-time-user journey (Module 02): forced password reset on first login, PIN setup, and the
// welcome / "Choose Class" screen.
//
// UNVERIFIED LOCATORS — this journey needs a brand-new account still on its default password, which the previous suite
// never had, so nothing here has been seen live. The Sign In form and the "Choose Class" prompt (button.choose-a-class /
// .first-time-user-message) are known from earlier work; the set-new-password and PIN-setup screens are located by
// their visible wording and field types. If verification shows different wording or markup, fix it HERE, once.
//
// The account comes from .env (see .env.example):
//   NEW_USER_USERNAME      a fresh user still on the default first-login password
//   NEW_USER_NEW_PASSWORD  the password to set during the forced reset
//   NEW_USER_PIN           a valid 5-digit PIN to set
// The default first-login password is always `classedge`.

const { LoginPage } = require('./login.page');

const DEFAULT_PASSWORD = 'classedge';

class NewUserPage {
  constructor(page) {
    this.page = page;
    this.login = new LoginPage(page);

    // --- Forced "set a new password" step ---
    this.setPasswordHeading = page
      .getByText(/set (a |your )?new password|change your password|create (a )?new password|reset (your )?password/i)
      .first();
    this.newPasswordFields = page.locator('input[type="password"]').filter({ visible: true });
    this.setPasswordSubmit = page
      .getByRole('button', { name: /submit|save|set password|change|update|continue/i })
      .first();

    // --- PIN setup step ---
    this.pinSetupHeading = page.getByText(/(set|create|setup)( up)?( a| your)?( new)? pin/i).first();
    // CONFIRMED LIVE (v 0.0.223): a two-step, five-box flow. "Set PIN" (login-change-pin-new-input-0..4, Next, Auto-Generate,
    // skip link) moves on by itself once the fifth box is filled to "Verify PIN" (login-change-pin-verify-input-0..4, Set Pin,
    // skip link); typing the PIN again there completes the setup.
    this.pinInputs = page.locator('input[data-qa-id^="login-change-pin-new-input-"]').filter({ visible: true });
    this.pinVerifyInputs = page
      .locator('input[data-qa-id^="login-change-pin-verify-input-"]')
      .filter({ visible: true });
    this.pinNextBtn = page.locator('[data-qa-id="login-change-pin-next-button"]');
    this.pinSetBtn = page.locator('[data-qa-id="login-change-pin-setpin-button"]');
    this.pinSkipLink = page.locator('[data-qa-id="login-change-pin-skip-link"]');

    // --- Welcome / first class ---
    this.welcomeMessage = page.locator('.first-time-user-message');
    this.chooseClassBtn = page.locator('button.choose-a-class, .choose-class');
  }

  static get defaultPassword() {
    return DEFAULT_PASSWORD;
  }

  static get credentials() {
    return {
      username: process.env.NEW_USER_USERNAME,
      newPassword: process.env.NEW_USER_NEW_PASSWORD,
      pin: process.env.NEW_USER_PIN,
      // The fresh new-user account lives in a different school (Velammal) from the main QA account.
      schoolSearchTerm: process.env.NEW_USER_SCHOOL_SEARCH_TERM || process.env.SCHOOL_SEARCH_TERM,
    };
  }

  static get configured() {
    const { username, newPassword, pin } = NewUserPage.credentials;
    return Boolean(username && newPassword && pin);
  }

  /** Sign in through the password form with the given password. */
  async signInWithPassword(password) {
    const { username, schoolSearchTerm } = NewUserPage.credentials;
    await this.login.signInWithPassword({ schoolSearchTerm, username, password });
  }

  /** Fill the two password fields of the forced-reset step and submit. */
  async setNewPassword(password) {
    const fields = this.newPasswordFields;
    await fields.first().waitFor({ state: 'visible', timeout: 15000 });
    const count = await fields.count();
    for (let i = 0; i < count; i++) await fields.nth(i).fill(password); // new + confirm
    await this.setPasswordSubmit.click();
  }

  /** Type characters one key press per box (the boxes only react to real key presses, not to fill()). */
  async typeIntoBoxes(boxes, characters) {
    await boxes.first().waitFor({ state: 'visible', timeout: 15000 });
    const chars = String(characters).split('');
    for (let i = 0; i < chars.length; i++) await boxes.nth(i).pressSequentially(chars[i]);
  }

  /** Step 1 ("Set PIN"): type the PIN. The page moves on to "Verify PIN" by itself after the fifth digit. */
  async enterPin(pin) {
    await this.typeIntoBoxes(this.pinInputs, pin);
  }

  /** Step 2 ("Verify PIN"): type it again; the setup completes (a visible Set Pin button is pressed if it doesn't). */
  async confirmPin(pin) {
    await this.typeIntoBoxes(this.pinVerifyInputs, pin);
    await this.page.waitForTimeout(1500);
    if (await this.pinSetBtn.isVisible().catch(() => false)) await this.pinSetBtn.click({ force: true });
  }
}

module.exports = { NewUserPage, DEFAULT_PASSWORD };
