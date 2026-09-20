// Page Object for the Whiteboard module's own dedicated surfaces (header,
// welcome-back panel, first-time choose-a-class prompt, Clear Whiteboard
// confirm dialog, pan/zoom groups). The drawing-surface primitives
// themselves (wbSvg, paths, drawStroke, penStroke, tool selection) already
// live on ToolbarPage (pages/toolbar.page.js) since Whiteboard's canvas IS
// Toolbar's drawing surface -- reuse that instead of duplicating it here.
//
// Selectors cross-checked against automation-cep-cypress's own
// WhiteboardPage.js (cypress/pages/WhiteboardPage.js) and the QA reference
// doc (D:\Projects\cep2-workspace\docs\qa\DATA-QA-ID-REFERENCE.md).

class WhiteboardPage {
  constructor(page) {
    this.page = page;

    // --- Header ---
    this.logoContainer = page.locator('[data-qa-id="wb-header-logo-container"]');
    this.logoImage = page.locator('[data-qa-id="wb-header-logo-image"]');
    this.versionText = page.locator('[data-qa-id="wb-header-version-text"]');
    this.calendar = page.locator('[data-qa-id="wb-header-calendar-container"]');

    // --- Welcome Back panel (WB-WELCOME-01's paradox subject) ---
    this.welcomeBackContainer = page.locator('[data-qa-id="wb-welcome-back-container"]');
    this.welcomeBackTitle = page.locator('[data-qa-id="wb-welcome-back-title"]');

    // --- First-time "Choose a class" prompt (confirmed dead no-op, WB-CHOOSE-01) ---
    this.chooseAClassBtn = page.locator('button.choose-a-class, .choose-class');
    this.firstTimeUserMessage = page.locator('.first-time-user-message');

    // --- Bottom-left active-context bar (class/subject + chapter/topic) ---
    this.currentClassBtn = page.locator('[data-qa-id="playlist-current-grade-subject-btn"]');
    this.currentChapterTopicBtn = page.locator('[data-qa-id="playlist-chapter-topic-btn"]');

    // --- Drawing surface (kept here too for convenience; canonical copy on ToolbarPage) ---
    this.wbContainer = page.locator('[data-qa-id="wb-drawing-container"]');
    this.wbSvg = this.wbContainer.locator('svg').first();
    this.paths = this.wbContainer.locator('svg path');
    this.panGroup = this.wbContainer.locator('g.svg-pan-zoom_viewport, g#panGroup');

    // --- Text objects (foreignObject + contenteditable, WB-TEXT-01/02) ---
    this.textObjects = this.wbContainer.locator('foreignObject.text-element');
    this.textEditor = this.wbContainer.locator('.text-input-container[contenteditable="true"]');

    // --- Clear Whiteboard (via Eraser panel) ---
    this.clearWhiteboardBtn = page.locator('[data-qa-id="toolbar-eraser-clear-whiteboard"]');
    // No documented data-qa-id for the confirm dialog itself -- role/text based.
    this.clearConfirmDialogConfirmBtn = page.getByRole('button', { name: /clear whiteboard/i });
    this.clearConfirmDialogCancelBtn = page.getByRole('button', { name: /cancel/i });

    // --- Add Resource -> Whiteboard action card save/download (WB-SAVE-DEAD-02) ---
    this.addResourceWhiteboardCard = page.locator('[data-qa-id="add-resource-action-whiteboard"]');
    this.addResourceWhiteboardSaveBtn = page.locator('[data-qa-id="add-resource-whiteboard-save-playlist-btn"]');
    this.addResourceWhiteboardDownloadBtn = page.locator('[data-qa-id="add-resource-whiteboard-download-pdf-btn"]');

    // --- Playlist strip (to confirm Clear Whiteboard doesn't touch resources) ---
    this.playlistResourceCards = page.locator('[data-qa-id="playlist-resource-card"]');
  }

  /** Read the pan/zoom transform of the OUTER wrapper (used outside a Player) --
   * see WB-PANZOOM-01: this is a DIFFERENT mechanism from the inner panGroup. */
  async outerTransform() {
    return this.wbContainer.evaluate((el) => getComputedStyle(el).transform).catch(() => null);
  }

  async innerPanGroupTransform() {
    const count = await this.panGroup.count();
    if (count === 0) return null;
    return this.panGroup
      .first()
      .getAttribute('transform')
      .catch(() => null);
  }

  /** Insert a text object via the Insert Text tool, click at a canvas point,
   * and return the locator for the newly created (last) text object.
   * CONFIRMED LIVE (verifier pass): the very first Insert-Text click right
   * after selecting the tool can silently not register (canvas/tool still
   * settling) -- same class of flake already documented for the Pen tool's
   * own penStroke() helper. Verify a new foreignObject actually landed and
   * retry the tool-select + click once if not, rather than trusting a
   * single attempt. */
  async insertTextAt(x, y) {
    const before = await this.textObjects.count();
    for (let attempt = 0; attempt < 2; attempt++) {
      await this.page.locator('[data-qa-id="toolbar-tool-gtInserttext"]').click({ force: true });
      await this.page.waitForTimeout(500);
      const box = await this.wbSvg.boundingBox();
      await this.page.mouse.click(box.x + x, box.y + y);
      await this.page.waitForTimeout(700);
      if ((await this.textObjects.count()) > before) break;
      await this.page.waitForTimeout(500);
    }
    return this.textObjects.last();
  }

  /** Insert a text object and type into it. CONFIRMED LIVE (this project,
   * contradicts the cross-repo Cypress-suite claim in WB-TEXT-01's workbook
   * row): whether the newly created text object is already focused on
   * insertion is NON-DETERMINISTIC (observed both ways across repeated
   * runs) -- check first and only click when it genuinely isn't focused
   * yet (clicking an already-focused/editing element can hang on this app). */
  async insertTextAndType(x, y, text) {
    const textObj = await this.insertTextAt(x, y);
    const alreadyFocused = await this.page.evaluate(() => {
      const active = document.activeElement;
      return !!(active && active.closest && active.closest('.text-input-container[contenteditable="true"]'));
    });
    if (!alreadyFocused) {
      await textObj
        .locator('.text-input-container[contenteditable="true"]')
        .click({ timeout: 5000 })
        .catch(() => {});
    }
    await this.page.keyboard.type(text);
    return textObj;
  }

  /** Fire a full synthetic pointer+mouse event sequence at (x1,y1)->(x2,y2)
   * on the element matching `selector`, evaluated in-page.
   * CONFIRMED LIVE: the minimal 3-event sequence (pointerdown/move/up alone)
   * does NOT register with this app's drawing handlers regardless of
   * target -- the FULL sequence (pointerover+pointerenter+pointerdown+
   * mousedown, then interleaved pointermove+mousemove steps, then
   * pointerup+mouseup), matching automation-cep-cypress's own
   * WhiteboardPage.drawStroke exactly, is required. With the full sequence,
   * dispatching on the OUTER wb-drawing-container wrapper is still a
   * confirmed no-op, while the INNER <svg> registers a real stroke -- see
   * WB-DISPATCH-01. */
  async dispatchFullPointerSequence(selector, x1, y1, x2, y2, steps = 14) {
    return this.page.evaluate(
      ({ sel, x1, y1, x2, y2, steps }) => {
        const el = document.querySelector(sel);
        if (!el) return 'MISSING';
        const rect = el.getBoundingClientRect();
        const fire = (types, x, y) => {
          types.forEach((type) => {
            const Ctor = type.startsWith('pointer') ? PointerEvent : MouseEvent;
            el.dispatchEvent(
              new Ctor(type, {
                bubbles: true,
                cancelable: true,
                composed: true,
                clientX: rect.left + x,
                clientY: rect.top + y,
                buttons: 1,
                button: 0,
                pointerId: 1,
                pointerType: 'mouse',
                isPrimary: true,
              })
            );
          });
        };
        fire(['pointerover', 'pointerenter', 'pointerdown', 'mousedown'], x1, y1);
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          fire(['pointermove', 'mousemove'], x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
        }
        fire(['pointerup', 'mouseup'], x2, y2);
        return 'OK';
      },
      { sel: selector, x1, y1, x2, y2, steps }
    );
  }

  async openClearWhiteboardConfirm() {
    // Double-click Eraser tool to open its panel, then click Clear Whiteboard.
    await this.page.locator('[data-qa-id="toolbar-tool-gtErase"]').dblclick({ force: true });
    await this.page.waitForTimeout(1000);
    await this.clearWhiteboardBtn.click({ timeout: 8000 });
    await this.page.waitForTimeout(500);
  }
}

module.exports = { WhiteboardPage };
