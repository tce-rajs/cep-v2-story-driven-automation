// Page Object for the Playlist strip (resource cards, E-Books, Contents
// popup, Playlist Options/filters, and the "+" Add Resources picker).
//
// Locator strategy: same as the other page objects — prefer
// [data-qa-id="..."] from the app's own QA reference doc. A couple of
// controls needed live confirmation because the reference doc's own id
// (playlist-contents-selector) turned out not to be the real click target —
// playlist-chapter-topic-btn is the actual CONTENTS tile trigger.

class PlaylistPage {
  constructor(page) {
    this.page = page;

    // --- Core strip ---
    this.eBooksTile = page.locator('[data-qa-id="playlist-e-book-btn"]');
    this.contentsTile = page.locator('[data-qa-id="playlist-chapter-topic-btn"]');
    this.resourceCards = page.locator('[data-qa-id="playlist-resource-card"], [data-qa-id="playlist-asset-card"]');
    this.optionsMenuBtn = page.locator('[data-qa-id="playlist-resource-nav-filter-menu"]');
    this.leftScrollBtn = page.locator('[data-qa-id="playlist-resource-nav-left-scroll"]');
    this.rightScrollBtn = page.locator('[data-qa-id="playlist-resource-nav-right-scroll"]');
    this.pinBtn = page.locator('[data-qa-id="playlist-resource-nav-pin"]');
    this.addResourcesTrigger = page.locator('[data-qa-id="add-resource-trigger"]');
    this.drawerBtn = page.locator('[data-qa-id="playlist-drawer-btn"]');

    // --- E-Books popup ---
    this.eBookLaunchButtons = page.locator('[data-qa-id="playlist-e-book-launch-btn"]');

    // --- Contents popup (Chapters/Topics) ---
    this.contentsPopup = page.locator('[data-qa-id="playlist-chapter-tp-popup"]');
    this.chapterItems = page.locator('[data-qa-id="playlist-select-chapter"]');
    this.topicItems = page.locator('[data-qa-id="playlist-select-topic"]');
    this.contentsSearchToggle = page.locator('[data-qa-id="playlist-popup-chapter-tp-search-btn"]');
    this.contentsSearchInput = page.locator('[data-qa-id="playlist-chapter-tp-search-input"]');
    this.contentsSearchCancel = page.locator('[data-qa-id="playlist-chapter-tp-search-submit"]'); // toggles to "Cancel" once search is active

    // --- Playlist Options / Filters menu ---
    this.filterOptions = page.locator('[data-qa-id="playlist-filter-menu-select"]');
    this.filterEditBtn = page.locator('[data-qa-id="playlist-filter-menu-edit-btn"]');
    this.filterEditConfirmBtn = page.locator('[data-qa-id="playlist-filter-menu-edit-confirm-btn"]:visible');
    this.filterResetBtn = page.locator('[data-qa-id="playlist-filter-menu-reset-btn"]');
    this.filterResetConfirmBtn = page.locator('[data-qa-id="playlist-filter-menu-reset-confirm-btn"]:visible');
    // The Edit-confirm and Reset-confirm popups share this same "Cancel"
    // data-qa-id (confirmed live), and both popup templates stay mounted in
    // the DOM at once -- filter to the currently visible one.
    this.filterCancelBtn = page.locator('[data-qa-id="playlist-filter-menu-cancel-btn"]:visible');
    this.filterCloseBtn = page.locator('[data-qa-id="playlist-filter-menu-close-btn"]');

    // --- Remove-resource confirmation (per-card) ---
    // Like the Filter menu's Edit/Reset dialogs, this app leaves every
    // previously-opened confirmation popup's template mounted in the DOM
    // (confirmed live: 4 stacked instances after a few remove attempts) --
    // scope to the currently visible one.
    this.resourceRemoveBtn = page.locator(
      '[data-qa-id="playlist-resource-remove-btn"], [data-qa-id="playlist-quiz-remove-btn"]'
    );
    this.resourceRemoveConfirmBtn = page.locator(
      '[data-qa-id="playlist-resource-remove-confirm-btn"]:visible, [data-qa-id="playlist-quiz-remove-confirm-btn"]:visible'
    );
    this.resourceRemoveCancelBtn = page.locator(
      '[data-qa-id="playlist-resource-cancle-btn"]:visible, [data-qa-id="playlist-quiz-cancle-btn"]:visible'
    );
    // Cards added via Add Resource are their own type (playlist-asset-card)
    // and use a different remove path -- an overflow ("...") icon per card
    // that reveals its own Remove option, rather than a direct hover-reveal
    // icon (cross-checked against a Cypress reference project's own page
    // object, which confirmed this exact split).
    this.assetOverflowIconBtn = page.locator('[data-qa-id="playlist-asset-overflow-icon-btn"]');
    this.assetRemoveBtn = page.locator('[data-qa-id="playlist-asset-remove-btn"]:visible');
    this.assetRemoveConfirmBtn = page.locator('[data-qa-id="playlist-asset-remove-confirm-btn"]:visible');

    // --- Add Resources picker ---
    this.addResourcesCloseBtn = page.locator('[data-qa-id="add-resource-close-btn"]');
    this.addResourcesActions = {
      create: page.locator('[data-qa-id="add-resource-action-create"]'),
      library: page.locator('[data-qa-id="add-resource-action-library"]'),
      gallery: page.locator('[data-qa-id="add-resource-action-gallery"]'),
      dropit: page.locator('[data-qa-id="add-resource-action-dropit"]'),
      aiAssist: page.locator('[data-qa-id="add-resource-action-ai-assist"]'),
      whiteboard: page.locator('[data-qa-id="add-resource-action-whiteboard"]'),
    };
  }

  /** The Options/Filter menu is a plain toggle with NO backdrop and NO
   * Escape-to-close support (both confirmed live) -- it only opens/closes by
   * clicking this same button, so callers must track open/closed state
   * themselves rather than assuming Escape closed it. */
  async openOptionsMenu() {
    const alreadyOpen = await this.filterOptions
      .first()
      .isVisible()
      .catch(() => false);
    if (!alreadyOpen) await this.optionsMenuBtn.click();
    await this.filterOptions.first().waitFor({ state: 'visible', timeout: 5000 });
  }

  async closeOptionsMenu() {
    const stillOpen = await this.filterOptions
      .first()
      .isVisible()
      .catch(() => false);
    if (stillOpen) await this.optionsMenuBtn.click();
  }

  /** CONFIRMED LIVE (this pass): the whole Playlist strip (resource cards,
   * CONTENTS/E-BOOKS tiles, "+" Add Resources) can be fully COLLAPSED,
   * leaving cards attached-in-DOM (a plain .count() finds them) but
   * genuinely not visible/interactive on screen -- a scrollIntoView+click
   * on a collapsed card is a silent no-op. Cross-checked against
   * automation-cep-cypress's own PlaylistPage.ensureDrawerVisible(): the
   * toggle's own text reads "SHOW"/"HIDE" depending on state. */
  async ensureDrawerVisible() {
    const text = ((await this.drawerBtn.textContent().catch(() => '')) || '').toUpperCase();
    if (text.includes('SHOW')) {
      await this.drawerBtn.click({ force: true });
      await this.page.waitForTimeout(1000);
    }
  }

  async openContentsPopup() {
    await this.contentsTile.click();
  }

  async openAddResourcesPicker() {
    await this.addResourcesTrigger.click();
  }

  /** Current chapter/Topic is persisted server-side per account (same
   * pattern confirmed for Navigation's "current class") and several tests
   * across this module switch it without restoring it. Rather than pin a
   * specific topic, actively guarantee the precondition each test actually
   * needs: at least one resource card showing right now. This app's
   * chapter/topic popup is confirmed DOM-unstable under rapid re-clicking
   * (same root cause as Navigation's NAV-CHP findings), so every step here
   * is deliberately slow and wrapped so one flaky click can't abort the
   * whole search -- worst case it just tries fewer chapters.
   */
  async ensureResourcesPresent(maxChaptersToTry = 4, maxTopicsPerChapter = 4) {
    if ((await this.resourceCards.count()) > 0) return;

    for (let c = 0; c < maxChaptersToTry; c++) {
      const opened = await this._tryOpenContentsPopup();
      if (!opened) continue;

      const chapterCount = await this.chapterItems.count();
      if (c >= chapterCount) break;
      const chapterOk = await this._tryClick(this.chapterItems.nth(c));
      if (!chapterOk) continue;
      await this.page.waitForTimeout(600);

      const topicCount = await this.topicItems.count();
      for (let t = 0; t < Math.min(topicCount, maxTopicsPerChapter); t++) {
        const topicOk = await this._tryClick(this.topicItems.nth(t));
        if (!topicOk) break; // popup likely re-rendered; move on to next chapter attempt
        await this.page.waitForTimeout(800);
        if ((await this.resourceCards.count()) > 0) return;
        const reopened = await this._tryOpenContentsPopup();
        if (!reopened) break;
        const rechapterOk = await this._tryClick(this.chapterItems.nth(c));
        if (!rechapterOk) break;
        await this.page.waitForTimeout(600);
      }
    }
  }

  async _tryOpenContentsPopup() {
    const alreadyOpen = await this.chapterItems
      .first()
      .isVisible()
      .catch(() => false);
    if (alreadyOpen) return true;
    try {
      await this.contentsTile.click({ timeout: 5000 });
      await this.chapterItems.first().waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async _tryClick(locator) {
    try {
      await locator.click({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /** Guarantee at least `min` Topics under the currently active Chapter,
   * switching Chapter if the current one doesn't have enough (used by tests
   * that need to index into 2+ distinct Topics, e.g. rapid-switch races). */
  async ensureMinTopics(min) {
    if ((await this.topicItems.count()) >= min) return;
    const chapterCount = await this.chapterItems.count();
    for (let c = 0; c < chapterCount; c++) {
      const ok = await this._tryClick(this.chapterItems.nth(c));
      if (!ok) continue;
      await this.page.waitForTimeout(600);
      if ((await this.topicItems.count()) >= min) return;
    }
  }

  /** Remove an asset card (one added via Add Resource) via its own
   * overflow-menu -> Remove -> confirm path. Caller must already be in
   * Playlist Edit mode. */
  async removeAssetCard(cardLocator) {
    await cardLocator.first().hover();
    // CONFIRMED LIVE (2026-09-20): act on THIS card's own overflow icon. The old `assetOverflowIconBtn.first()` was the
    // first one on the whole strip -- it only worked while the test's own asset was the only asset card; with
    // library-added items present it opened "Remove" for a different (curriculum) card.
    // CONFIRMED LIVE: cards of the same "asset" family carry different remove controls -- an overflow icon (custom and
    // library assets) or a quiz-style remove button (e.g. AI Assist's FlashCard / "My Exercise"). Use whichever this card has.
    await cardLocator
      .first()
      .locator(
        '[data-qa-id="playlist-asset-overflow-icon-btn"], [data-qa-id="playlist-quiz-remove-btn"], [data-qa-id="playlist-resource-remove-btn"]'
      )
      .first()
      .click();
    // A custom asset's overflow shows a menu with "Remove" first; the others go straight to the confirmation dialog.
    const menuRemove = this.assetRemoveBtn.first();
    if (
      await menuRemove
        .waitFor({ state: 'visible', timeout: 2500 })
        .then(() => true)
        .catch(() => false)
    ) {
      await menuRemove.click();
    }
    await this.assetRemoveConfirmBtn.or(this.resourceRemoveConfirmBtn).first().click();
  }

  /** Visible text of every Playlist card, in strip order — a fingerprint of the Playlist's state. */
  async cardTitles() {
    return (await this.resourceCards.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  }

  /** Type-icon image (src) of every card, in strip order. */
  async cardTypes() {
    return this.resourceCards.evaluateAll((els) =>
      els.map((el) => (el.querySelector('img.type-icon') || {}).getAttribute?.('src') || null)
    );
  }

  // --- Editing mode (Options > Edit). CONFIRMED LIVE in the previous suite: with every type checked, Edit
  // enters editing mode directly; only while a filter is narrowing the list does it first warn that editing
  // resets the filters. Per-card remove icons exist only while editing, and removing asks for confirmation. ---
  get finishEditingBtn() {
    return this.page.locator('button', { hasText: /finish editing/i });
  }

  async enterEditMode() {
    await this.openOptionsMenu();
    await this.filterEditBtn.click();
    await this.finishEditingBtn.waitFor({ state: 'visible', timeout: 5000 });
  }

  async finishEditing() {
    await this.finishEditingBtn.click();
    await this.page.waitForTimeout(500);
  }

  /** Remove one card while in editing mode (works for asset cards and for regular resource cards). */
  async removeCard(card) {
    await card.first().hover();
    const isAsset = (await card.first().getAttribute('data-qa-id')) === 'playlist-asset-card';
    if (isAsset) {
      await this.removeAssetCard(card);
    } else {
      await card
        .first()
        .locator('[data-qa-id="playlist-resource-remove-btn"], [data-qa-id="playlist-quiz-remove-btn"]')
        .click();
      await this.resourceRemoveConfirmBtn.first().click();
    }
    await this.page.waitForTimeout(1000);
  }

  /** Remove an asset card the test itself created (via Add Resource), leaving the shared topic as found.
   * CONFIRMED LIVE: removing an asset card through its overflow menu already leaves editing mode, unlike
   * removing a curriculum resource -- so "Finish editing" is only clicked if it is still showing. */
  async removeOwnedAsset(card) {
    await this.enterEditMode();
    await this.removeAssetCard(card);
    await this.page.waitForTimeout(1000);
    const finish = this.page.locator('button:visible', { hasText: /finish editing/i });
    if (
      await finish
        .last()
        .isVisible()
        .catch(() => false)
    )
      await finish.last().click({ timeout: 10000 });
  }

  /** Leave the Playlist holding only its `keepIndex`-th filter type checked; returns the resulting card count. */
  async filterToOnlyType(keepIndex) {
    await this.openOptionsMenu();
    const total = await this.filterOptions.count();
    for (let i = 0; i < total; i++) {
      const checked = (await this.filterOptions.nth(i).getAttribute('aria-selected')) === 'true';
      if (i !== keepIndex && checked) await this.filterOptions.nth(i).click();
      else if (i === keepIndex && !checked) await this.filterOptions.nth(i).click();
    }
    await this.page.waitForTimeout(600);
    return this.resourceCards.count();
  }

  /** Reset the Playlist (Options > Reset > confirm). */
  async resetPlaylist() {
    await this.openOptionsMenu();
    await this.filterResetBtn.click();
    await this.page
      .getByText(/are you sure you want to reset your playlist/i)
      .waitFor({ state: 'visible', timeout: 5000 });
    await this.filterResetConfirmBtn.click();
    await this.page.waitForTimeout(1000);
  }
}

module.exports = { PlaylistPage };
