// Page Object for CEP v2 Module 01 — Without Login (stories PRE-01..PRE-04,
// see CEPV2_Stories/01_WithoutLogin.md). Everything here is the state of the
// app BEFORE anyone signs in: it opens straight onto the whiteboard.
//
// Every locator/behaviour below was confirmed live against the QA client
// (v 0.0.223) on 2026-09-19. Drawing-surface and tool helpers are reused from
// ToolbarPage / WhiteboardPage rather than duplicated.

const { ToolbarPage } = require('./toolbar.page');
const { WhiteboardPage } = require('./whiteboard.page');

// The tools confirmed present in the signed-out toolbar. Magnet (gtMagnet) is
// deliberately absent -- it only appears after login (PRE-03-02).
const GUEST_TOOL_IDS = [
  'gtSelect',
  'gtWidgets',
  'gtBackground',
  'gtPan',
  'gtInserttext',
  'gtPen',
  'gtErase',
  'gtShapes',
  'gtZoom',
  'gtUndo',
  'gtRedo',
];

// The only widgets offered without login. Logged in, the same panel adds 20+
// subject widgets (Blood Vessel, DNA, Microscope, ...) after these eight.
const GUEST_WIDGETS = [
  'Compass',
  'Clock',
  'Ruler',
  'Protractor',
  'Set Square 30',
  'Set Square 45',
  'Curtain',
  'Split Screen',
];

class WithoutLoginPage {
  constructor(page) {
    this.page = page;
    this.toolbar = new ToolbarPage(page);
    this.whiteboard = new WhiteboardPage(page);

    // --- Header ---
    this.logoContainer = page.locator('[data-qa-id="wb-header-logo-container"]');
    this.logoImage = page.locator('[data-qa-id="wb-header-logo-image"]');
    this.versionText = page.locator('[data-qa-id="wb-header-version-text"]');
    this.calendar = page.locator('[data-qa-id="wb-header-calendar-container"]');

    // --- Toolbar / user menu ---
    this.magnetTool = page.locator('[data-qa-id="toolbar-tool-gtMagnet"]');
    this.userAvatar = page.locator('[data-qa-id="toolbar-user-avatar"]');
    this.userMenuTrigger = page.locator('[data-qa-id="toolbar-profile-trigger"]');

    // --- Sign-in panel. Permanently mounted, but collapsed ("peeking" from
    // the bottom edge) until the user opens it; opening it adds the
    // `login-modal-outer--active` modifier class (see entry.spec.js ENT-05). ---
    this.loginModal = page.locator('[data-qa-id="login-auth-modal-container"]');

    // --- Widgets ---
    this.widgetTools = page.locator('[data-qa-id^="toolbar-widget-tool-"]');
    this.clockWidget = page.locator('lib-clock');
    this.clockShowTimeBtn = page.locator('lib-clock #currentTime');
    this.clockHourInput = page.locator('lib-clock #myHour input');
    this.clockCloseBtn = page.locator('lib-clock .mycloseClock');
  }

  /** Open the app the way a teacher would: the base URL, nothing else. */
  async open() {
    await this.page.goto('./');
    await this.toolbar.wbSvg.waitFor({ state: 'visible', timeout: 15000 });
  }

  /** Watch for the sign-in panel ever being activated (or the URL leaving the
   * whiteboard) from now on. The panel's active state is transient, so a
   * point-in-time check at the end of a test could miss it opening and closing
   * again -- a MutationObserver installed up front cannot. */
  async startWatchingForLoginPrompt() {
    await this.page.evaluate(() => {
      window.__loginPromptSeen = false;
      window.__urlLeftWhiteboard = false;
      const modal = document.querySelector('[data-qa-id="login-auth-modal-container"]');
      const check = () => {
        if (modal && modal.classList.contains('login-modal-outer--active')) window.__loginPromptSeen = true;
        if (!location.pathname.endsWith('/whiteboard')) window.__urlLeftWhiteboard = true;
      };
      check();
      if (window.__loginWatcher) window.__loginWatcher.disconnect();
      window.__loginWatcher = new MutationObserver(check);
      if (modal) window.__loginWatcher.observe(modal, { attributes: true, attributeFilter: ['class'] });
      window.__loginUrlTimer = setInterval(check, 100);
    });
  }

  /** @returns {Promise<{loginPromptSeen: boolean, urlLeftWhiteboard: boolean}>} */
  async loginPromptReport() {
    return this.page.evaluate(() => ({
      loginPromptSeen: !!window.__loginPromptSeen,
      urlLeftWhiteboard: !!window.__urlLeftWhiteboard,
    }));
  }

  /** True if the whiteboard canvas is what's actually under the centre of the
   * screen -- i.e. no overlay/prompt is covering it. */
  async canvasIsUncovered() {
    return this.page.evaluate(() => {
      const top = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 3);
      return !!(top && top.closest('[data-qa-id="wb-drawing-container"]'));
    });
  }

  async viewportSize() {
    return this.page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
  }

  /** Pen stroke drawn with the real toolbar Pen; resolves once the stroke lands. */
  async draw(from = { x: 300, y: 300 }, to = { x: 600, y: 350 }) {
    await this.toolbar.penStroke(from, to);
  }

  /** Erase by dragging the Eraser across the given stroke path. */
  async eraseAcross(from = { x: 280, y: 300 }, to = { x: 620, y: 352 }) {
    await this.toolbar.selectTool('gtErase');
    await this.toolbar.drawStroke(from, to, 30);
  }

  /** Pick the fixed Rectangle from the Shapes panel, then click the canvas to
   * place it. CONFIRMED LIVE: choosing it from the panel places nothing by
   * itself -- the next click on the canvas (which also dismisses the panel)
   * is what inserts it. */
  async addRectangleAt(x = 600, y = 400) {
    await this.toolbar.openToolPanel('gtShapes');
    await this.page.locator('[data-qa-id="toolbar-shape-gtInsertRect"]').click({ force: true });
    await this.page.waitForTimeout(500);
    const box = await this.toolbar.wbSvg.boundingBox();
    await this.page.mouse.click(box.x + x, box.y + y);
    await this.page.waitForTimeout(800);
  }

  async openWidgets() {
    await this.toolbar.openToolPanel('gtWidgets');
    await this.widgetTools.first().waitFor({ state: 'visible', timeout: 5000 });
  }
}

module.exports = { WithoutLoginPage, GUEST_TOOL_IDS, GUEST_WIDGETS };
