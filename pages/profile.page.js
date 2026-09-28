// Page Object for the User Profile window (User menu -> "Signed in as" chevron): Account tab (preferred resource
// types, subjects) and Profile tab (Change Password, Change PIN). The User menu itself is UserMenuPage; this builds on
// its locators.
//
// CONFIRMED LIVE (probe, 2026-09-26, v 0.0.232): toolbar-profile-trigger opens the window on the Account tab
// (user-profile-tab-account / -tab-profile, user-profile-pref-toggle "Video, Learning Shorts, ...",
// user-profile-add-subjects-btn). Profile tab: user-profile-open-change-password / -open-change-pin; the password form
// is user-profile-pwd-form with -current-pwd-input / -new-pwd-input / -repeat-pwd-input, -pwd-cancel-btn and a Save
// (-pwd-save-btn) that starts disabled. PIN form ids (user-profile-current-pin-input-{i}, -new-pin-input-{i},
// -repeat-pin-input-{i}, -pin-autogen-link, -pin-cancel-btn, -pin-save-btn) come from DATA-QA-ID-REFERENCE.md.

const { UserMenuPage } = require('./user-menu.page');

class ProfilePage extends UserMenuPage {
  constructor(page) {
    super(page);
    this.window = page
      .locator('[data-qa-id="user-profile-tab-account"]')
      .locator(
        'xpath=ancestor::*[contains(@class,"mat-mdc-dialog") or contains(@class,"popover") or contains(@class,"cdk-overlay-pane")][1]'
      );
    this.pinForm = page
      .locator('[data-qa-id="user-profile-pin-form"], form:has([data-qa-id^="user-profile-new-pin-input-"])')
      .first();
    this.errorText = page.locator('mat-error, .error, .error-message, [class*="error"]').filter({ visible: true });
    this.snackbar = page.locator(
      'mat-snack-bar-container, .mat-mdc-snack-bar-container, .toast-container, [role="alert"]'
    );
    this.selectedFilters = page.locator(
      '[data-qa-id^="user-profile-filter-"].selected, [data-qa-id^="user-profile-filter-"][aria-selected="true"], [data-qa-id^="user-profile-filter-"].mat-mdc-chip-selected'
    );
    this.filterOptions = page.locator('[data-qa-id^="user-profile-filter-"]');
  }

  /** CONFIRMED LIVE (2026-09-26): a loading spinner overlay (ngx-spinner) covers the window for a moment after it opens
   * and after each save, swallowing clicks -- wait it out before pressing anything. */
  async waitForSpinner() {
    await this.page
      .locator('.ngx-spinner-overlay')
      .waitFor({ state: 'hidden', timeout: 20000 })
      .catch(() => {});
  }

  /** With Virtual Keyboard on, focusing a field opens the on-screen keyboard, which can cover the form's buttons; close it
   * with its own close control (same behaviour as in AiNoticesPage.hideKeyboard). */
  async hideKeyboard() {
    await this.page.waitForTimeout(600);
    await this.page.evaluate(() => {
      const k = [...document.querySelectorAll('.simple-keyboard')].find((e) => e.getBoundingClientRect().height > 0);
      if (!k || k.getBoundingClientRect().top >= innerHeight - 5) return;
      const top = k.getBoundingClientRect().top;
      const close = [...document.querySelectorAll('div.close')].find((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && Math.abs(r.bottom - top) < 60;
      });
      if (close) close.click();
    });
    await this.page.waitForTimeout(600);
  }

  /** Open the User Profile window on the Account tab. */
  async open() {
    await this.openProfileMenu();
    await this.drilldownTrigger.click({ force: true });
    await this.accountTab.waitFor({ state: 'visible', timeout: 10000 });
    await this.waitForSpinner();
  }

  async openProfileTab() {
    await this.profileTab.click({ force: true });
    await this.openChangePasswordLink.waitFor({ state: 'visible', timeout: 10000 });
  }

  async openChangePassword() {
    await this.open();
    await this.openProfileTab();
    await this.openChangePasswordLink.click({ force: true });
    await this.changePasswordForm.waitFor({ state: 'visible', timeout: 10000 });
  }

  async openChangePin() {
    await this.open();
    await this.openProfileTab();
    await this.openChangePinLink.click({ force: true });
    await this.newPinBox(0).waitFor({ state: 'visible', timeout: 10000 });
  }

  /** Type a PIN into a row of single-digit boxes (`box` is currentPinBox / newPinBox / repeatPinBox). */
  async fillPin(box, pin) {
    const digits = String(pin).split('');
    for (let i = 0; i < digits.length; i++) await box(i).fill(digits[i]);
  }

  async readPin(box, length = 5) {
    let out = '';
    for (let i = 0; i < length; i++) out += await box(i).inputValue();
    return out;
  }

  /** Change the password through the form; resolves with the server's reply (ok or not). */
  async changePassword(current, next) {
    await this.currentPasswordInput.fill(current);
    await this.newPasswordInput.fill(next);
    await this.repeatPasswordInput.fill(next);
    const reply = this.page.waitForResponse(
      (r) => ['POST', 'PUT', 'PATCH'].includes(r.request().method()) && /password/i.test(r.url()),
      { timeout: 20000 }
    );
    await this.hideKeyboard();
    await this.waitForSpinner();
    await this.changePasswordSaveBtn.click();
    return reply;
  }

  async changePin(current, next) {
    await this.fillPin(this.currentPinBox, current);
    await this.fillPin(this.newPinBox, next);
    await this.fillPin(this.repeatPinBox, next);
    const reply = this.page.waitForResponse(
      (r) => ['POST', 'PUT', 'PATCH'].includes(r.request().method()) && /pin/i.test(r.url()),
      { timeout: 20000 }
    );
    await this.hideKeyboard();
    await this.waitForSpinner();
    await this.changePinSaveBtn.click();
    return reply;
  }

  /** Take a type out of the preferred list: each chip (user-profile-filter-<i>) has its own remove button (button.closeBtn)
   * that only shows on hover -- clicking the chip itself does nothing (confirmed live 2026-09-26). */
  async removeFilter(name) {
    const chip = this.filterOptions.filter({ hasText: name }).first();
    await chip.hover().catch(() => {});
    await chip.locator('button.closeBtn').evaluate((el) => el.click());
  }

  /** Remove a subject chip through its own remove control (also hover-only). */
  async removeSubject(name) {
    await this.waitForSpinner();
    const rm = this.subjectChipRemove(name);
    await rm.hover().catch(() => {});
    await rm.evaluate((el) => el.click());
  }

  /** Names of the subject chips on the Account tab (from their remove buttons' ids). */
  async subjectNames() {
    return this.subjectChipRemoveButtons.evaluateAll((els) =>
      els.map((e) => e.getAttribute('data-qa-id').replace('user-profile-subject-remove-', ''))
    );
  }

  async closeWindow() {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press('Escape');
  }
}

module.exports = { ProfilePage };
