// Page Object for signing in: the Sign In panel (PIN view + Password view) and the
// post-login landing state. Adapted from the previous suite's login page + auth helper,
// whose locators were confirmed live.

class LoginPage {
  constructor(page) {
    this.page = page;

    // --- Sign-in panel shell (permanently mounted; collapsed until opened) ---
    this.modal = page.locator('[data-qa-id="login-auth-modal-container"]');
    this.toggleButton = page.locator('[data-qa-id="login-auth-toggle-button"]');
    this.modalTitle = page.locator('[data-qa-id="login-auth-title-text"]');
    this.modalSubtitle = page.locator('[data-qa-id="login-auth-subtitle-text"]');
    this.closeButton = page.locator('.btn-close');

    // --- PIN view ---
    this.pinForm = page.locator('[data-qa-id="login-pin-form"]');
    this.pinPasswordLink = page.locator('[data-qa-id="login-pin-password-link"]');
    this.pinErrorMessage = page.locator('[data-qa-id="login-pin-error-message"]');

    // --- Password view ---
    this.passwordForm = page.locator('[data-qa-id="login-pwd-form"]');
    this.schoolSelect = page.locator('[data-qa-id="login-pwd-school-select"]');
    this.usernameInput = page.locator('[data-qa-id="login-pwd-username-input"]');
    this.passwordInput = page.locator('[data-qa-id="login-pwd-password-input"]');
    this.submitButton = page.locator('[data-qa-id="login-pwd-submit-button"]');
    this.pinLink = page.locator('[data-qa-id="login-pwd-pin-link"]');
    this.passwordErrorMessage = page.locator('[data-qa-id="login-pwd-error-message"]');

    // --- Signed-in state ---
    this.avatar = page.locator('[data-qa-id="toolbar-user-avatar"]');
    this.welcomeBackTitle = page.locator('[data-qa-id="wb-welcome-back-title"]');
    this.guestModeText = page.getByText('You are currently in Guest Mode.');

    // --- First-time-user session ---
    // A brand-new account that has signed in with its password but not yet chosen a class lands on the "Choose a class"
    // screen (no avatar, no Sign In button) with only this floating Sign Out button, which starts a short countdown.
    this.floatingSignOut = page.locator('[data-qa-id="floating-signout-trigger-btn"]');
  }

  pinDigitBox(index) {
    return this.page.locator(`[data-qa-id="login-pin-digit-input-${index}"]`);
  }

  async open() {
    await this.page.goto('./');
  }

  async openSignIn() {
    await this.toggleButton.click();
  }

  /**
   * Call right after loading the app. CONFIRMED LIVE (v 0.0.223): reloading while a first-time account is mid-setup
   * (PIN-setup screen showing) drops it into a signed-in "Choose a class" screen that has no Sign In button, so the
   * next sign-in would find nothing to click. Sign that session out through its floating Sign Out button (which runs a
   * ~7s countdown) so the app is back in Guest Mode. A no-op for every normal load.
   */
  async signOutLeftoverFirstTimeSession() {
    await this.toggleButton
      .or(this.floatingSignOut)
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => {});
    if (await this.floatingSignOut.isVisible().catch(() => false)) {
      await this.floatingSignOut.click({ force: true });
      await this.toggleButton.waitFor({ state: 'visible', timeout: 30000 });
    }
  }

  async enterPin(pin) {
    const digits = String(pin).split('');
    for (let i = 0; i < digits.length; i++) {
      await this.pinDigitBox(i).fill(digits[i]);
    }
  }

  /**
   * Full PIN sign-in from Guest Mode, ending once the avatar is visible.
   * CONFIRMED LIVE in the previous suite: a fresh PIN login can transiently time out
   * right after another test signed the same account out (a backend timing race, not
   * a lockout) -- a reload-and-retry clears it, so the whole attempt is retried.
   */
  async signInWithPin(pin, { toggleTimeout = 30000, avatarTimeout = 15000, retries = 2 } = {}) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await this.page.goto('./');
        await this.page.waitForTimeout(2000);
        await this.signOutLeftoverFirstTimeSession();
        await this.toggleButton.click({ timeout: toggleTimeout });
        await this.enterPin(pin);
        await this.avatar.waitFor({ state: 'visible', timeout: avatarTimeout });
        return;
      } catch (err) {
        if (attempt === retries) throw err;
      }
    }
  }

  async switchToPasswordView() {
    await this.pinPasswordLink.click();
  }

  /** Pick a school from the dropdown by typing a search substring. */
  async selectSchool(schoolSearchTerm) {
    await this.schoolSelect.click();
    await this.page.keyboard.type(schoolSearchTerm);
    const option = this.page.locator('.ng-option', { hasText: new RegExp(schoolSearchTerm, 'i') }).first();
    await option.waitFor({ state: 'visible' });
    await option.click();
    await this.schoolSelect.locator('.ng-value').waitFor({ state: 'visible' });
  }

  /** Opens the sign-in panel, switches to the password view, fills and submits it. */
  async signInWithPassword({ schoolSearchTerm, username, password }) {
    await this.page.goto('./');
    await this.page.waitForTimeout(2000);
    await this.signOutLeftoverFirstTimeSession();
    await this.openSignIn();
    await this.switchToPasswordView();
    await this.selectSchool(schoolSearchTerm);
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

module.exports = { LoginPage };
