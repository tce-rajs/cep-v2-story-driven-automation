// Page Object for the User menu (avatar popover: Profile / Account / Classroom Mode /
// Theme / Feedback / Build / Virtual Keyboard / Sign out) and its Account/Profile tabs.
//
// Path to the Account tab: avatar -> toolbar-profile-trigger -> user-profile-tab-account.
//
// Change Password / Change PIN are submitted only on the spare account (DISPOSABLE_* in .env), never on the shared
// test accounts.

class UserMenuPage {
  constructor(page) {
    this.page = page;

    this.avatarTrigger = page.locator('[data-qa-id="toolbar-user-avatar"]');
    this.drilldownTrigger = page.locator('[data-qa-id="toolbar-profile-trigger"]');
    this.accountTab = page.locator('[data-qa-id="user-profile-tab-account"]');
    this.profileTab = page.locator('[data-qa-id="user-profile-tab-profile"]');
    // The data-qa-ids above sit on an inner element; the tab itself (the one that carries
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
    // Whiteboard History: a panel headed "WHITEBOARD HISTORY" with one row per saved version, newest first,
    // e.g. "#19 · 23 strokes +2 ~4 -0 · 11:00:25 07/10".
    this.wbHistoryBtn = page.locator('[data-qa-id="toolbar-profile-wb-history-btn"]');
    this.wbHistoryPanel = page
      .locator('div, section, mat-dialog-container')
      .filter({ has: page.getByText('WHITEBOARD HISTORY', { exact: true }) })
      .last();

    /** The Whiteboard History rows, newest first, parsed into { version, strokes, added, changed, removed, time }. */
    this.wbHistoryRows = async () => {
      const read = async () => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
      let text = await read();
      for (let i = 0; i < 16 && !/#\d+ · \d+ strokes/.test(text); i++) {
        await page.waitForTimeout(500);
        text = await read();
      }
      return [...text.matchAll(/#(\d+) · (\d+) strokes \+(\d+) ~(\d+) -(\d+) · (\d{2}:\d{2}:\d{2} \d{2}\/\d{2})/g)].map(
        (m) => ({
          version: Number(m[1]),
          strokes: Number(m[2]),
          added: Number(m[3]),
          changed: Number(m[4]),
          removed: Number(m[5]),
          time: m[6],
        })
      );
    };
    this.buildInfoBtn = page.locator('[data-qa-id="toolbar-profile-build-btn"]');
    this.feedbackBtn = page.locator('[data-qa-id="toolbar-profile-feedback-btn"]');
    this.wbHistoryBtn = page.locator('[data-qa-id="toolbar-profile-wb-history-btn"]');

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
    // The "Signed in as" label and the user's name are sibling elements inside one list row.
    this.signedInAsRow = page
      .locator('li')
      .filter({ hasText: /signed in as/i })
      .first();
  }

  /** The avatar click can fail to open the profile menu on
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

  /** Sign out via the real UI (avatar -> Sign Out). There is no confirmation
   * dialog; signing out is immediate. Resolves once the avatar is gone. */
  async signOut() {
    await this.openProfileMenu();
    await this.signOutBtn.click({ force: true });
    await this.avatarTrigger.waitFor({ state: 'hidden', timeout: 10000 });
  }

  /** Navigates to the Account/Profile tab row. Clicking
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
