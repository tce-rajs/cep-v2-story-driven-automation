// Page Object for the User menu (avatar popover: Profile / Account / Classroom Mode /
// Theme / Feedback / Build / Virtual Keyboard / Sign out) and its Account/Profile tabs.
//
// CONFIRMED LIVE (2026-09-06): the manual pass's "screen not reached"
// finding is corrected here -- avatar click -> toolbar-profile-trigger ->
// user-profile-tab-account all work reliably with this account. Selectors
// cross-checked against a Cypress reference project's own
// AccountManagementPage.js.
//
// Change Password/PIN are deliberately NOT submitted in any test here
// (destructive credential risk to the shared QA account) -- only the
// surrounding menu/form-presence behavior is verified, matching this
// project's established pattern for other destructive flows (Add
// Resource's Create form, etc.) and the reference project's own explicit
// scoping note for this module.

class UserMenuPage {
  constructor(page) {
    this.page = page;

    this.avatarTrigger = page.locator('[data-qa-id="toolbar-user-avatar"]');
    this.drilldownTrigger = page.locator('[data-qa-id="toolbar-profile-trigger"]');
    this.accountTab = page.locator('[data-qa-id="user-profile-tab-account"]');
    this.profileTab = page.locator('[data-qa-id="user-profile-tab-profile"]');
    // CONFIRMED LIVE (v 0.0.223): the data-qa-ids above sit on an inner element; the tab itself (the one that carries
    // aria-selected) is only reachable by role. Use these to read which tab is active.
    this.accountTabItem = page.getByRole('tab', { name: /^\s*account/i });
    this.profileTabItem = page.getByRole('tab', { name: /^\s*profile/i });
    // The Profile tab's content is NOT inside its role=tabpanel (that stays empty): it is Change Password / Change PIN.
    this.profileContent = page.getByText(/change password/i).first();

    this.openChangePasswordLink = page.locator('[data-qa-id="user-profile-open-change-password"]');
    this.changePasswordForm = page.locator('[data-qa-id="user-profile-pwd-form"]');
    this.currentPasswordInput = page.locator('[data-qa-id="user-profile-current-pwd-input"]');
    this.newPasswordInput = page.locator('[data-qa-id="user-profile-new-pwd-input"]');
    this.repeatPasswordInput = page.locator('[data-qa-id="user-profile-repeat-pwd-input"]');
    this.changePasswordCancelBtn = page.locator('[data-qa-id="user-profile-pwd-cancel-btn"]');
    this.changePasswordSaveBtn = page.locator('[data-qa-id="user-profile-pwd-save-btn"]');

    this.openChangePinLink = page.locator('[data-qa-id="user-profile-open-change-pin"]');
    this.currentPinBox = (i) => page.locator(`[data-qa-id="user-profile-current-pin-input-${i}"]`);
    this.newPinBox = (i) => page.locator(`[data-qa-id="user-profile-new-pin-input-${i}"]`);
    this.repeatPinBox = (i) => page.locator(`[data-qa-id="user-profile-repeat-pin-input-${i}"]`);
    this.pinAutoGenerateLink = page.locator('[data-qa-id="user-profile-pin-autogen-link"]');
    this.changePinCancelBtn = page.locator('[data-qa-id="user-profile-pin-cancel-btn"]');
    this.changePinSaveBtn = page.locator('[data-qa-id="user-profile-pin-save-btn"]');

    this.darkModeToggle = page.locator('[data-qa-id="toolbar-profile-dark-mode-toggle"]');
    this.virtualKeyboardToggle = page.locator('[data-qa-id="toolbar-profile-keyboard-toggle"]');
    this.classroomModeSwitcher = page.locator('[data-qa-id="toolbar-profile-planning-mode"]');
    this.signOutBtn = page.locator('[data-qa-id="toolbar-profile-signout-btn"]');
    this.buildInfoBtn = page.locator('[data-qa-id="toolbar-profile-build-btn"]');
    this.feedbackBtn = page.locator('[data-qa-id="toolbar-profile-feedback-btn"]');

    // --- Account tab: Preferred Resource Type + Subjects ---
    // Confirmed data-qa-ids per cep2-workspace/docs/qa/DATA-QA-ID-REFERENCE.md
    // (section 17, User Profile) -- prefer these over generic/text-based
    // fallbacks that were guesses before this module had actually been run.
    this.preferredResourceTypeDropdown = page.locator('[data-qa-id="user-profile-pref-toggle"]');
    this.preferredResourceTypeCloseBtn = page.locator('[data-qa-id="user-profile-pref-close-btn"]');
    this.resourceTypeFilter = (i) => page.locator(`[data-qa-id="user-profile-filter-${i}"]`);
    this.selectAllFiltersBtn = page.locator('[data-qa-id="user-profile-select-all-filters-btn"]');
    this.applyFilterBtn = page.locator('[data-qa-id="user-profile-apply-filter-btn"]');
    this.subjectChipRemoveButtons = page.locator('[data-qa-id^="user-profile-subject-remove-"]');
    this.subjectChips = page.locator('mat-chip, .subject-chip');
    this.subjectChipRemove = (title) => page.locator(`[data-qa-id="user-profile-subject-remove-${title}"]`);
    this.addSubjectsBtn = page.locator('[data-qa-id="user-profile-add-subjects-btn"]');
    this.subjectMenuCloseBtn = page.locator('[data-qa-id="user-profile-subject-menu-close-btn"]');
    this.subjectPickerOptions = page.locator('[data-qa-id^="user-profile-subject-add-"]');

    // --- Signed-in-as popover (outer menu, before drilling into the tab group) ---
    // CONFIRMED LIVE: the "Signed in as" label and the user's name are sibling elements inside one list row.
    this.signedInAsRow = page
      .locator('li')
      .filter({ hasText: /signed in as/i })
      .first();
  }

  /** Confirmed live: the avatar click can fail to open the profile menu on
   * the first attempt shortly after a fresh login (same class of timing
   * issue seen elsewhere in this app) -- retry once before giving up. */
  async openProfileMenu() {
    await this.avatarTrigger.click({ force: true });
    const opened = await this.drilldownTrigger
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (!opened) {
      await this.avatarTrigger.click({ force: true });
      await this.drilldownTrigger.waitFor({ state: 'visible', timeout: 10000 });
    }
  }

  /** Sign out via the real UI (avatar -> Sign Out). CONFIRMED LIVE: there is no confirmation
   * dialog; signing out is immediate. Resolves once the avatar is gone. */
  async signOut() {
    await this.openProfileMenu();
    await this.signOutBtn.click({ force: true });
    await this.avatarTrigger.waitFor({ state: 'hidden', timeout: 10000 });
  }

  /** Navigates to the Account/Profile tab row. CONFIRMED LIVE: clicking
   * "Account" specifically never actually reveals its own panel (a real
   * bug, see the file-level comment) -- this only gets the caller to the
   * tab row itself, not necessarily to Account's content. */
  async openAccountTab() {
    await this.openProfileMenu();
    await this.drilldownTrigger.click({ force: true });
    await this.accountTab.waitFor({ state: 'visible', timeout: 10000 });
    await this.accountTab.click({ force: true });
    await this.page.waitForTimeout(1000);
  }
}

module.exports = { UserMenuPage };
