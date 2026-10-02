// Page Object for the post-login Dashboard's class/chapter/topic navigation
// (the "Class Popup" and "Chapters Popup").
//
// Locator strategy: same as login.page.js — prefer [data-qa-id="..."] from
// the app's own QA reference doc. Two things in this module have NO
// documented id at all (confirmed live, not assumed): the popup's own tabs
// ("Recent Classes" / "All My Classes" render as plain Angular Material
// tabs with no data-qa-id), so those use Playwright's role-based locators
// instead.

const { applyClassMap } = require('../config/moduleClassMap');

class NavigationPage {
  constructor(page) {
    this.page = page;

    // --- Core Navigation UI ---
    this.currentClassBtn = page.locator('[data-qa-id="playlist-current-grade-subject-btn"]');
    this.currentChapterTopicBtn = page.locator('[data-qa-id="playlist-chapter-topic-btn"]');

    // --- Class Popup ---
    // No data-qa-id on the tabs themselves — located by role/name instead.
    this.recentClassesTab = page.getByRole('tab', { name: 'Recent Classes' });
    this.allMyClassesTab = page.getByRole('tab', { name: 'All My Classes' });
    this.recentClassButtons = page.locator('[data-qa-id="playlist-recently-selected-class-btn"]');

    // --- All My Classes cascade ---
    this.gradeButtons = page.locator('[data-qa-id="common-select-grade-btn"]');
    this.divisionButtons = page.locator('[data-qa-id="common-select-division-btn"]');
    this.subjectButtons = page.locator('[data-qa-id="common-select-subject-btn"]');

    // --- Chapters Popup ---
    this.chapterTpPopup = page.locator('[data-qa-id="playlist-chapter-tp-popup"]');
    this.chapterItems = page.locator('[data-qa-id="playlist-select-chapter"]');
    this.topicItems = page.locator('[data-qa-id="playlist-select-topic"]');
    this.chapterTpSearchToggle = page.locator('[data-qa-id="playlist-popup-chapter-tp-search-btn"]');
    this.chapterTpSearchInput = page.locator('[data-qa-id="playlist-chapter-tp-search-input"]');
    this.chapterTpSearchCancel = this.chapterTpPopup.getByText('Cancel', { exact: true });

    // --- Post-login shell (needed to confirm "logged in" before navigating) ---
    this.userAvatar = page.locator('[data-qa-id="toolbar-user-avatar"]');
  }

  /** Land on the confirmed-working class/chapter/topic for a module (see
   * config/moduleClassMap.js). Caller must already be signed in. */
  async applyClassMap(moduleKey) {
    await applyClassMap(this, moduleKey);
    await this.page.waitForTimeout(1000);
  }

  async openClassPopup() {
    await this.currentClassBtn.click();
  }

  /** Clicks a TOGGLE button until `openSignal` is visible. CONFIRMED in the desktop-client run of 2026-10-01: a
   * single click on the class or chapter button sometimes left its popup closed (the click landed while the app was
   * still busy, e.g. right after sign-in or an autosave), and ~190 tests then timed out on the next click. Each retry
   * first checks the popup is still closed, so a slow opening is never toggled shut again. */
  async _openUntil(button, openSignal, tries = 4) {
    for (let i = 0; i < tries; i++) {
      if (await openSignal.isVisible().catch(() => false)) return;
      await button.click({ force: true, timeout: 10000 });
      if (
        await openSignal
          .waitFor({ state: 'visible', timeout: 4000 + i * 2000 })
          .then(() => true)
          .catch(() => false)
      )
        return;
    }
    await openSignal.waitFor({ state: 'visible', timeout: 5000 }); // fails with a clear "not visible" message
  }

  /** Clicks `target` until `nextSignal` appears (for steps inside an open popup: tab -> grades -> divisions). */
  async _clickUntil(target, nextSignal, tries = 3) {
    for (let i = 0; i < tries; i++) {
      await target.click({ timeout: 10000 });
      if (
        await nextSignal
          .first()
          .waitFor({ state: 'visible', timeout: 3000 + i * 2000 })
          .then(() => true)
          .catch(() => false)
      )
        return;
    }
  }

  /**
   * Switch to a known Grade/Division/Subject via the cascade. Several
   * cascade tests leave the account's "current class" pointed at whatever
   * they last selected (it's server-persisted), which then leaks into
   * other tests/files that assume a baseline — call this to land on a
   * specific, well-explored curriculum (e.g. Class 9A Hindi Language has
   * 29 chapters with varying topic counts) regardless of what ran before.
   */
  async resetToClass(grade, division, subject) {
    // CONFIRMED in the desktop client (2026-10-02): right after another class switch, the chooser can open and then
    // close again by itself (the app finishing loading the previous class closes popups). So the whole cascade --
    // open, All My Classes, grade, division, subject -- is retried from the start if any step finds the chooser gone,
    // instead of one long wait on a tab that is no longer there. The class button toggles, so _openUntil only clicks
    // it while the chooser is closed.
    const steps = async () => {
      await this._openUntil(this.currentClassBtn, this.allMyClassesTab);
      // The modal re-renders for a moment right after opening -- clicking through it too fast hits
      // "element detached, retrying" churn.
      await this.page.waitForTimeout(800);
      await this.allMyClassesTab.click({ timeout: 4000 });
      await this.gradeButton(grade).first().click({ timeout: 4000 });
      await this.page.waitForTimeout(300);
      await this.divisionButton(division).first().click({ timeout: 4000 });
      await this.page.waitForTimeout(300);
      await this.subjectButton(subject).first().click({ timeout: 4000 });
    };
    for (let attempt = 1; ; attempt++) {
      try {
        await steps();
        break;
      } catch (err) {
        if (attempt === 4) throw err;
        await this.page.waitForTimeout(1500 * attempt);
      }
    }
    // Right after a client relaunch the class label can take well over 10 s to update (seen 2026-09-26: the switch
    // landed, just late), so allow 30 s.
    await this.currentClassBtn.filter({ hasText: subject }).waitFor({ state: 'visible', timeout: 30000 });
    // CONFIRMED in the client (2026-10-02): the chooser slides shut after a switch, and a second switch started during
    // that animation saw the closing tab as "open", skipped opening it, and timed out when the tab disappeared. Wait
    // until it has really closed, so the next switch (a spec's own beforeEach after the fixture's) starts clean.
    await this.allMyClassesTab.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  async openChaptersPopup() {
    await this.currentChapterTopicBtn.click();
  }

  /** Select a Chapter/Topic by position (0-indexed) via the Chapters popup.
   * Used by Player tests that need a specific chapter known (via the
   * confirmed class/chapter map cross-checked from a reference project) to
   * hold a given resource type. */
  async goToChapterTopic(chapterIndex, topicIndex) {
    await this._selectChapterTopic(() => this.chapterItems.nth(chapterIndex), topicIndex);
  }

  /** Same as goToChapterTopic, but selects the Chapter by its visible text
   * instead of position (some references identify a chapter by name). */
  async goToChapterTopicByName(chapterName, topicIndex) {
    await this._selectChapterTopic(() => this.chapter(chapterName), topicIndex);
  }

  /** Shared by the two methods above. CONFIRMED LIVE (2026-09-19): clicking a chapter that is NOT already the
   * current one auto-selects its first topic and closes the popup, so the topic list is not there to click; the
   * list only shows when a chapter that is already current is clicked. So: if the list did not appear, the first
   * topic is already selected (done for topicIndex 0), otherwise reopen the popup, click the now-current chapter
   * again and pick the topic from its list. */
  async _selectChapterTopic(chapterLocator, topicIndex) {
    // The popup button TOGGLES, so only click it when the popup is not already open (a caller such as showTopicsOf
    // leaves it open).
    await this._openUntil(this.currentChapterTopicBtn, this.chapterItems.first());
    await this.page.waitForTimeout(500);
    await chapterLocator().click({ timeout: 10000 });
    await this.page.waitForTimeout(500);

    const listed = () =>
      this.topicItems
        .first()
        .waitFor({ state: 'visible', timeout: 2000 })
        .then(() => true)
        .catch(() => false);

    if (!(await listed())) {
      if (topicIndex > 0) {
        // CONFIRMED in the desktop client (2026-10-02): the app is still loading the chapter just chosen and closes the
        // popup again while it is being reopened, so the topic click timed out (49 tests). Retry the reopen-and-pick
        // step until the topic list is really there.
        for (let attempt = 1; ; attempt++) {
          try {
            await this.page.waitForTimeout(1000 * attempt);
            await this._openUntil(this.currentChapterTopicBtn, this.chapterItems.first());
            await this.page.waitForTimeout(500);
            if (!(await listed())) await chapterLocator().click({ timeout: 5000 });
            await this.topicItems.nth(topicIndex).click({ timeout: 5000 });
            break;
          } catch (err) {
            if (attempt === 4) throw err;
          }
        }
      }
    } else {
      await this.topicItems.nth(topicIndex).click({ timeout: 10000 });
    }
    await this.page.waitForTimeout(500);
    await this._closeChaptersPopupIfOpen();
  }

  /** Make a chapter current and leave the Chapters popup OPEN showing that chapter's topics.
   * CONFIRMED LIVE (2026-09-20): the popup is two panes -- "Choose a Chapter" on the left and "Choose a Topic" on the
   * right, and the right pane always lists the topics of the CURRENT chapter. Clicking another chapter makes it current,
   * jumps to its first topic and closes the popup, so a chapter's topics can only be read once it is current. */
  async showTopicsOf(chapterIndex) {
    await this.goToChapterTopic(chapterIndex, 0);
    await this.openChaptersPopup();
    await this.topicItems.first().waitFor({ state: 'visible', timeout: 10000 });
  }

  /** Run a search in the Chapters popup. CONFIRMED LIVE: it is a "Search Table of Contents" -- it matches TOPICS (listed
   * under "Choose a Topic", chapter list hidden), it runs on Enter/submit rather than while typing, an empty query
   * shows nothing, and "Cancel" is what brings the chapter view back. */
  async searchContents(term) {
    await this.chapterTpSearchInput.fill(term);
    await this.chapterTpSearchInput.press('Enter');
    await this.page.waitForTimeout(1500);
  }

  /** Confirmed live (cross-checked against a Cypress reference project's
   * own equivalent method): selecting a Topic does not reliably auto-close
   * the Chapters popup, leaving it open and intercepting clicks on the
   * Playlist strip underneath -- close it via its own toggle if so. */
  async _closeChaptersPopupIfOpen() {
    const stillOpen = await this.chapterItems
      .first()
      .isVisible()
      .catch(() => false);
    if (stillOpen) {
      await this.currentChapterTopicBtn.click({ timeout: 5000 }).catch(() => {});
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Guarantee the Recent Classes list has at least `minCount` entries,
   * switching between two known classes if it doesn't. This account's
   * history fluctuates across a long test run (e.g. after other tests'
   * cascade switches), so tests that need 2+ entries call this instead of
   * skipping when the count happens to come up short.
   */
  async ensureRecentClasses(minCount) {
    // Always leaves the Class Popup CLOSED on return -- callers open it
    // themselves afterward, and this popup toggles closed on a second
    // open() call while already open (confirmed live, GSD-CYP-03), so this
    // method must never leave it open behind the caller's back. Also
    // confirmed live: after resetToClass() switches tabs to "All My
    // Classes", the popup can reopen on THAT tab next time rather than
    // defaulting back to Recent Classes -- explicitly re-select the
    // Recent Classes tab before counting rather than trusting the default.
    await this.openClassPopup();
    await this.recentClassesTab.click({ timeout: 5000 }).catch(() => {});
    await this.page.waitForTimeout(300);
    let count = await this.recentClassButtons.count();
    await this.currentClassBtn.click(); // close
    await this.page.waitForTimeout(300);
    if (count >= minCount) return;

    await this.resetToClass('Class 9', 'A', 'Hindi Language');
    await this.openClassPopup();
    await this.recentClassesTab.click({ timeout: 5000 }).catch(() => {});
    await this.page.waitForTimeout(300);
    count = await this.recentClassButtons.count();
    await this.currentClassBtn.click(); // close
    await this.page.waitForTimeout(300);
    if (count >= minCount) return;

    await this.resetToClass('Class 12', 'A', 'Physics');
  }

  /** A grade/division/subject pill by its visible label. */
  gradeButton(label) {
    return this.gradeButtons.filter({ hasText: label });
  }

  divisionButton(label) {
    return this.divisionButtons.filter({ hasText: label });
  }

  /** Confirmed live: several subjects are substrings of another real
   * subject in the same class (e.g. "Physics" / "Physics Practicals",
   * "Biology" / "Biology Practicals", "Chemistry" / "Chemistry
   * Practicals") -- a plain substring match on the pill label picks up
   * both and throws a strict-mode violation. Match the whole (trimmed)
   * label exactly by default; pass a RegExp directly to opt out. */
  subjectButton(label) {
    const pattern =
      label instanceof RegExp ? label : new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
    return this.subjectButtons.filter({ hasText: pattern });
  }

  /** A chapter list item by its visible (partial) text. */
  chapter(text) {
    return this.chapterItems.filter({ hasText: text });
  }

  topic(text) {
    return this.topicItems.filter({ hasText: text });
  }
}

module.exports = { NavigationPage };
