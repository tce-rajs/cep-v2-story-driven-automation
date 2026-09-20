// Page Object for the Compass module.
//
// Per CEP_TestCases/Compass_Module_Test_Cases_Final.xlsx (CMP-RECONCILE-01):
// Compass has TWO genuinely separate, non-overlapping surfaces -- do not
// conflate them:
//   1. Teaching-mode floating trigger (compass-trigger-btn, bottom-left of
//      the whiteboard, small/easy to miss) -> opens an AnalyseIt/ExploreIt
//      popover for in-lesson use. This is the module's main focus.
//   2. Planning-mode Question Bank (a separate workspace reached via the
//      profile popover's Classroom Mode switch) -> Create Quiz / Create
//      Revision Test content-authoring flows, outside live teaching.
//
// Teaching-mode selectors are taken from the workbook's own Cypress-ground-
// truth cross-check (CMP-TRIG-01..07); Planning-mode selectors are mostly
// text-based since no data-qa-id was confirmed for most of that surface.

class CompassPage {
  constructor(page) {
    this.page = page;

    // --- Teaching-mode floating trigger ---
    this.triggerBtn = page.locator('[data-qa-id="compass-trigger-btn"]');
    this.analyseItItem = page.locator('[data-qa-id="compass-analyseit-item"]');
    this.revisionTestsItem = page.locator('[data-qa-id="compass-revision-tests-item"]');
    this.detailViewListBtn = page.locator('[data-qa-id="compass-detail-view-list-btn"]');
    this.listAssignment = (cxId) => page.locator(`[data-qa-id="compass-list-assignment-${cxId}"]`);
    this.detailViewQuestionsBtn = page.locator('[data-qa-id="compass-detail-view-questions-btn"]');
    this.questionToggleAnswerBtn = page.locator('[data-qa-id="compass-question-toggle-answer-btn"]');
    this.detailCancelBtn = page.locator('[data-qa-id="compass-detail-cancel-btn"]');
    this.listCancelBtn = page.locator('[data-qa-id="compass-list-cancel-btn"]');
    // ExploreIt's own widget tiles/Open-Widgets link have no confirmed
    // data-qa-id -- text/class based.
    this.exploreItOpenWidgetsLink = page.getByText('Open Widgets', { exact: false });
    this.noHomeworkMessage = page.getByText(/no homework available to analyse/i);
    this.noHomeworkCreateLink = page.getByText(/create a new homework/i);

    // --- Planning mode (profile popover -> Classroom Mode -> Planning) ---
    this.profileAvatar = page.locator('[data-qa-id="toolbar-user-avatar"]');
    this.planningModeOption = page.getByText('Planning', { exact: true });
    this.teachingModeOption = page.getByText('Teaching', { exact: true });
    // CONFIRMED LIVE: switching to Planning mode navigates to a genuinely
    // different app/URL (teach/whiteboard -> plan/#/canvas) whose left nav
    // is a Nebular sidebar (<nb-sidebar class="... compacted">) collapsed to
    // icon-only (56px wide) by default. Its item labels are real
    // `<span class="menu-title">` text nodes but with `display: none` while
    // compacted -- a locator on the span itself has no bounding box and
    // fails actionability (even with force:true, which bypasses visibility
    // CHECKS but still needs a real box to click at). The containing `<a>`
    // (the icon link) stays visible/clickable throughout, so target that
    // instead -- `.filter({ hasText })` matches on textContent regardless of
    // the descendant span's own display state.
    this.questionBankNavItem = page.locator('a').filter({ hasText: 'Question Bank' }).first();
    this.contentLibraryNavItem = page.locator('a').filter({ hasText: 'Content Library' }).first();
    this.createQuizBtn = page.getByText(/create quiz/i);
    this.createRevisionTestBtn = page.getByText(/create revision test/i);
    this.questionCards = page.locator('[class*="question-card"], [class*="questionCard"]');
    this.addQuizBtn = page.getByRole('button', { name: 'Add Quiz' });
    this.quizTitleInput = page.locator('input[formcontrolname="title"], input[placeholder*="Title" i]').first();
  }

  /**
   * Open the Compass floating trigger's popover.
   *
   * CONFIRMED LIVE this pass: the 19/32 timeouts originally seen waiting on
   * compass-analyseit-item were NOT the same pointer-events:none click-
   * through bug confirmed for the Add Resources picker -- on 'Class 11 A
   * Mathematics' the AnalyseIt entry simply never renders in the DOM at all
   * (0 count, 5/5 reproductions including full reloads), because it's
   * gated per class/subject (see CMP-TRIG-02); ExploreIt rendered fine the
   * whole time. The fix for that was choosing a better fixture class (see
   * compass.spec.js's beforeEach), not this method.
   *
   * That said, this method still guards against the GENERIC version of the
   * Add Resources bug class (a stuck `pointer-events: none` on the popover
   * container after a click that otherwise "took") and against the trigger
   * button being genuinely absent (some class/subject/topic combos have no
   * compass-trigger-btn in the DOM at all -- confirmed live for 'Class 5 A
   * Mathematics' and 'Class 9 A Hindi Language') -- in that case it returns
   * quietly instead of hanging on an unguarded click() for its full default
   * actionability timeout.
   */
  async openTrigger(maxReloadAttempts = 2) {
    for (let attempt = 0; attempt < maxReloadAttempts; attempt++) {
      if (attempt > 0) {
        await this.page.reload();
        await this.page
          .locator('[data-qa-id="toolbar-user-avatar"]')
          .waitFor({ state: 'visible', timeout: 15000 })
          .catch(() => {});
        await this.page.waitForTimeout(1000);
      }
      const triggerVisible = await this.triggerBtn.isVisible({ timeout: 5000 }).catch(() => false);
      if (!triggerVisible) continue; // may be a transient render race -- retry once via reload

      // CONFIRMED LIVE: on some class/subject/topic combos (e.g. 'Class 5 A
      // Mathematics') the trigger button can be transiently visible for an
      // isVisible() check and then vanish again before the click actually
      // dispatches -- a plain `.click({force:true})` with no explicit
      // timeout then falls back to waiting out the whole remaining TEST
      // budget (not just a few seconds) for the locator to resolve again,
      // turning a "this class doesn't really have the trigger" finding into
      // a full test-timeout hang. Bound it explicitly and treat a timeout
      // here the same as "not visible" -- retry via reload instead.
      const clicked = await this.triggerBtn
        .click({ force: true, timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (!clicked) continue;
      await this.page.waitForTimeout(800);
      const menu = this.page.locator('.compass-menu.open');
      const menuVisible = await menu.isVisible({ timeout: 2000 }).catch(() => false);
      if (!menuVisible) continue; // click may not have registered -- retry
      const clickable = await menu.evaluate((el) => getComputedStyle(el).pointerEvents !== 'none').catch(() => true);
      if (clickable) return { opened: true };
      await this.triggerBtn.click({ force: true }).catch(() => {}); // close before reload/retry
    }
    return { opened: false };
  }

  /**
   * Open the avatar's outer profile menu, retrying the click if it didn't
   * actually register. CONFIRMED LIVE this pass: clicking the avatar and
   * immediately clicking the "Planning"/"Teaching" text label right after
   * (a fixed 600ms wait, no verification the menu actually opened) is
   * flaky across repeated live runs -- 3 separate reproduction attempts saw
   * it succeed once, then fail twice with the SAME label resolving but
   * reporting `hidden`/no bounding box, meaning the outer menu simply
   * hadn't opened yet (or the click missed) rather than a real app timing
   * gate. Wait for a stable, always-present menu anchor
   * (toolbar-profile-planning-mode, the Classroom Mode switcher) to
   * actually be visible before proceeding, retrying the avatar click if not.
   */
  async _openProfileMenuReliably(maxAttempts = 3) {
    const menuAnchor = this.page.locator('[data-qa-id="toolbar-profile-planning-mode"]');
    for (let i = 0; i < maxAttempts; i++) {
      // CONFIRMED LIVE this pass: the Planning-mode app (/plan/#/canvas) has
      // ZERO data-qa-id attributes anywhere in its entire DOM (confirmed via
      // a full-page querySelectorAll('[data-qa-id]') returning an empty
      // array) and no toolbar-user-avatar/header at all -- it's a
      // structurally separate Angular/Nebular app, not a view within the
      // Teaching app. So this avatar locator can only ever resolve while
      // already back on a /teach/ page. Bound the click with a short
      // explicit timeout so a call from the Planning app fails fast (a few
      // seconds) instead of hanging out Playwright's full default 30s
      // actionability wait on a locator that will never resolve there.
      const avatarVisible = await this.profileAvatar.isVisible({ timeout: 3000 }).catch(() => false);
      if (!avatarVisible) return false;
      await this.profileAvatar.click({ force: true });
      await this.page.waitForTimeout(700);
      const open = await menuAnchor.isVisible({ timeout: 2000 }).catch(() => false);
      if (open) return true;
      await this.page.waitForTimeout(500);
    }
    return false;
  }

  async switchToPlanningMode() {
    const menuOpen = await this._openProfileMenuReliably();
    if (!menuOpen) return { switched: false, reason: 'outer profile menu never opened' };
    await this.planningModeOption.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await this.planningModeOption.click({ force: true }).catch(() => {});
    await this.page.waitForTimeout(2000);
    const switched = this.page.url().includes('/plan/');
    // CONFIRMED LIVE: the Planning app's own sidebar (Question Bank/Content
    // Library nav) can still be empty/unrendered for several seconds right
    // after switching into it -- observed anywhere from ~2s to needing a
    // full reload to recover, across repeated live runs (worse under
    // concurrent load against the shared QA account). Wait, and if it's
    // still not there, a same-page reload of the Planning SPA (not a
    // logout/relogin) reliably re-populates the sidebar -- do that once as
    // a bounded fallback so callers don't each need their own retry logic.
    if (switched) {
      const gotSidebar = await this.questionBankNavItem
        .waitFor({ state: 'visible', timeout: 10000 })
        .then(() => true)
        .catch(() => false);
      if (!gotSidebar) {
        await this.page.reload().catch(() => {});
        await this.questionBankNavItem.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
      }
    }
    return { switched };
  }

  async switchToTeachingMode() {
    const menuOpen = await this._openProfileMenuReliably();
    if (menuOpen) {
      await this.teachingModeOption.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      await this.teachingModeOption.click({ force: true }).catch(() => {});
      await this.page.waitForTimeout(2000);
      if (this.page.url().includes('/teach/')) return { switched: true };
    }
    // FALLBACK (real, confirmed structural constraint, not a workaround for
    // a test-tooling gap): the Planning app exposes no avatar/menu control
    // at all to get back to Teaching mode via the UI with a stable
    // selector. Every test using this method re-logs-in via its own
    // beforeEach anyway, so navigating straight back to the Teaching base
    // URL is a legitimate, equivalent way to restore a known state for
    // subsequent tests/steps in the same spec file.
    const base = process.env.BASE_URL || 'https://ce-qa-school.devstudi.com/teach/';
    await this.page.goto(base).catch(() => {});
    await this.profileAvatar.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    return { switched: this.page.url().includes('/teach/'), viaFallbackNavigation: true };
  }
}

module.exports = { CompassPage };
