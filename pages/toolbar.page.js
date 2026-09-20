// Page Object for the Whiteboard Toolbar module.
//
// Heavily cross-checked against a Cypress reference project's own
// ToolbarPage.js and its e2e specs (tests/pages under automation-cep-cypress)
// -- most selectors below are confirmed there already; a few (autosave
// toast, text-object formatting panel, background option ids) were
// additionally confirmed live for this project on 2026-09-05.

const TOOL_IDS = [
  'gtSelect',
  'gtWidgets',
  'gtBackground',
  'gtPan',
  'gtInserttext',
  'gtPen',
  'gtErase',
  'gtShapes',
  'gtZoom',
  'gtMagnet',
  'gtUndo',
  'gtRedo',
];

class ToolbarPage {
  constructor(page) {
    this.page = page;

    this.container = page.locator('.toolbar-container');
    this.allTools = page.locator('[data-qa-id^="toolbar-tool-"]');
    // Like several other float-ui popups across this app, closed panel
    // templates stay mounted in the DOM (confirmed live: 2 stacked
    // instances) -- scope to the currently visible one.
    this.panel = page.locator('.toolbar-submenu-floating-ui .float-ui-container:visible');

    // --- Whiteboard drawing surface ---
    this.wbContainer = page.locator('[data-qa-id="wb-drawing-container"]');
    this.wbSvg = this.wbContainer.locator('svg').first();
    this.paths = this.wbContainer.locator('svg path');

    // --- Pen panel ---
    this.penColorOptions = page.locator('.penColorOption');
    this.penColorSelected = page.locator('.penColorOption.selected');

    // --- Eraser panel ---
    this.eraserSizeSlider = page.locator('[data-qa-id="toolbar-eraser-size-slider"]');
    this.eraserFreeToggle = page.locator('[data-qa-id="toolbar-eraser-free-toggle"]');
    this.eraserClearAnnotationsBtn = page.locator('[data-qa-id="toolbar-eraser-clear-annotations"]');

    // --- Background panel ---
    this.backgroundOptions = page.locator('[data-qa-id^="toolbar-background-"]');
    this.backgroundActive = page.locator('[data-qa-id^="toolbar-background-"].active');
    this.noBackgroundOption = page.locator('[data-qa-id="toolbar-background-gtBlankPage"]');

    // --- Text object formatting panel (appears when an existing text
    // object is clicked with the Select tool) ---
    this.textEditor = this.wbContainer.locator('.text-input-container[contenteditable="true"]');
    this.textMenuFontSlider = page.locator('[data-qa-id="toolbar-text-menu-font-slider"]');
    this.textMenuFontSelect = page.locator('[data-qa-id="toolbar-text-menu-font-select"]');
    this.textMenuBoldBtn = page.locator('[data-qa-id="toolbar-text-menu-bold-btn"]');
    this.textMenuItalicBtn = page.locator('[data-qa-id="toolbar-text-menu-italic-btn"]');
    this.textMenuUnderlineBtn = page.locator('[data-qa-id="toolbar-text-menu-underline-btn"]');
    this.textMenuAlignLeftBtn = page.locator('[data-qa-id="toolbar-text-menu-align-left-btn"]');
    this.textMenuAlignCenterBtn = page.locator('[data-qa-id="toolbar-text-menu-align-center-btn"]');
    this.textMenuAlignRightBtn = page.locator('[data-qa-id="toolbar-text-menu-align-right-btn"]');
    this.textMenuDeleteBtn = page.locator('[data-qa-id="toolbar-text-menu-delete-btn"]');
    this.textMenuToFrontBtn = page.locator('[data-qa-id="toolbar-text-menu-to-front"]');
    this.textMenuToBackBtn = page.locator('[data-qa-id="toolbar-text-menu-to-back"]');
    this.textMenuDuplicateBtn = page.locator('[data-qa-id="toolbar-text-menu-duplicate"]');
    this.textMenuColorSwatches = page.locator('[data-qa-id^="toolbar-text-menu-color-"]');

    // --- Path (shape/stroke) object menu, appears when Select tool clicks
    // an existing drawn object ---
    this.pathMenuDeleteBtn = page.locator('[data-qa-id="toolbar-path-menu-delete-btn"]');
    this.pathMenuDuplicateBtn = page.locator('[data-qa-id="toolbar-path-menu-duplicate"]');
    this.pathMenuToFrontBtn = page.locator('[data-qa-id="toolbar-path-menu-to-front"]');
    this.pathMenuToBackBtn = page.locator('[data-qa-id="toolbar-path-menu-to-back"]');

    // --- Widgets panel ---
    this.widgetDisciplineSelect = page.locator('[data-qa-id="toolbar-widget-discipline-select"]');
    this.widgetCloseBtn = page.locator('[data-qa-id="toolbar-widget-close-btn"]');
    this.widgetTool = (name) => page.locator(`[data-qa-id="toolbar-widget-tool-${name}"]`);

    // --- Zoom panel ---
    this.zoomSlider = page.locator('[data-qa-id="toolbar-zoom-slider"]');
    this.zoomInBtn = page.locator('[data-qa-id="toolbar-zoom-in-btn"]');
    this.zoomOutBtn = page.locator('[data-qa-id="toolbar-zoom-out-btn"]');
    this.zoomResetBtn = page.locator('[data-qa-id="toolbar-zoom-reset-btn"]');

    // --- Autosave toast (confirmed live: "Saving whiteboard E:x / N:y in
    // Zs" counts down, then "Whiteboard Saved! N stroke(s)") ---
    this.savingToast = page.getByText(/saving whiteboard/i);
    this.savedToast = page.getByText(/whiteboard saved/i);
  }

  tool(toolId) {
    return this.page.locator(`[data-qa-id="toolbar-tool-${toolId}"]`);
  }

  async selectTool(toolId) {
    await this.tool(toolId).click({ force: true });
    await this.page.waitForTimeout(600);
  }

  async openToolPanel(toolId) {
    await this.tool(toolId).dblclick({ force: true });
    await this.page.waitForTimeout(1000);
    // Confirmed live: the double-tap that opens a tool's panel doesn't
    // always register on the first attempt (more so right after other
    // panel/tool activity) -- retry once rather than fail outright.
    const opened = await this.panel.isVisible().catch(() => false);
    if (!opened) {
      await this.tool(toolId).dblclick({ force: true });
      await this.page.waitForTimeout(1200);
    }
  }

  /** CONFIRMED LIVE: every tool button's inner `.toolpadding` div is
   * ALWAYS present regardless of active state -- the tool's actual
   * selected/active state is signalled by an extra `changecolor` class
   * appended to that same div (e.g. "toolpadding tools hello changecolor"
   * when active vs. "toolpadding tools hello" when not). Scoping to
   * `.toolpadding` alone (the old selector) matches unconditionally and
   * can never report false. */
  isToolActive(toolId) {
    return this.tool(toolId).locator('.toolpadding.changecolor');
  }

  async closePanelByTappingOutside() {
    await this.page.mouse.click(200, 400);
    await this.page.waitForTimeout(600);
  }

  async pathCount() {
    return this.paths.count();
  }

  /** Confirmed live: right after login, pathCount() can briefly read 0
   * before this account's persisted whiteboard content has finished
   * loading/rendering -- polls until two consecutive reads agree, so a
   * "before" baseline captured right after login is trustworthy. */
  async waitForBoardToSettle(maxAttempts = 8) {
    await this.wbSvg.waitFor({ state: 'visible', timeout: 10000 });
    let last = -1;
    for (let i = 0; i < maxAttempts; i++) {
      const current = await this.pathCount();
      if (current === last) return current;
      last = current;
      await this.page.waitForTimeout(500);
    }
    return last;
  }

  /** Empty the board through the app's own Eraser -> Clear whiteboard -> confirm flow, so a test starts from a
   * known-blank canvas with nothing selected. The board is persisted per class/topic, so content (and a leftover
   * selection) from earlier tests would otherwise skew every absolute count and "last path" lookup.
   * `whiteboard` is the WhiteboardPage, which owns the Clear button and its confirm dialog. */
  async clearBoard(whiteboard) {
    await this.waitForBoardToSettle();
    await this.openToolPanel('gtErase');
    await whiteboard.clearWhiteboardBtn.click({ force: true });
    await whiteboard.clearConfirmDialogConfirmBtn.click({ force: true, timeout: 5000 });
    for (let i = 0; i < 10 && (await this.pathCount()) > 0; i++) await this.page.waitForTimeout(500);
    await this.closePanelByTappingOutside();
  }

  /** Draw a stroke on the whiteboard SVG via real pointer events (mouse
   * drag alone doesn't reliably trigger this app's drawing handlers). */
  async drawStroke(from, to, steps = 14) {
    await this.wbSvg.waitFor({ state: 'visible', timeout: 10000 });
    const box = await this.wbSvg.boundingBox();
    const fx = box.x + from.x,
      fy = box.y + from.y;
    const tx = box.x + to.x,
      ty = box.y + to.y;
    await this.page.mouse.move(fx, fy);
    await this.page.mouse.down();
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      await this.page.mouse.move(fx + (tx - fx) * t, fy + (ty - fy) * t);
    }
    await this.page.mouse.up();
    await this.page.waitForTimeout(700);
  }

  /** Confirmed live: the very first Pen stroke right after a fresh
   * login/tool switch can silently not register (canvas still settling) --
   * verify a new path actually landed (via the same `paths` count the tests
   * themselves check) and retry once if not. */
  async penStroke(from, to) {
    await this.selectTool('gtPen');
    const before = await this.pathCount();
    await this.drawStroke(from, to);
    if ((await this.pathCount()) === before) {
      await this.page.waitForTimeout(500);
      await this.drawStroke(from, to);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Helpers added for the CEP v2 story suite (Module 05 Toolbar / Module 06 Whiteboard).
  // ---------------------------------------------------------------------------------------------

  /** Rendered stroke colour ("rgb(r, g, b)") and width (px) of a drawn path. */
  async strokeOf(pathLocator) {
    return pathLocator.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { color: cs.stroke, width: parseFloat(cs.strokeWidth) };
    });
  }

  /** The `d` (geometry) of every path on the canvas, so a test can tell which strokes a tool left untouched. */
  async pathData() {
    return this.paths.evaluateAll((els) => els.map((el) => el.getAttribute('d')));
  }

  /** Bounding box, relative to the page, of the most recently drawn path. */
  async lastPathBox() {
    return this.paths.last().boundingBox();
  }

  /** Set a range slider to a position between its own min (0) and max (1) by clicking along its track.
   * CONFIRMED LIVE: the eraser's Material slider only takes a REAL pointer input -- a script-set value or a keyboard
   * key moves the "Size" label but the eraser keeps cutting at its previous size (gap cut out of a stroke: 40px at
   * size 2, 100px at size 83 via mouse; unchanged via keyboard). A click at 2px from the left edge lands on ~0. */
  async setSlider(slider, fraction) {
    const box = await slider.boundingBox();
    const x = box.x + 2 + (box.width - 4) * fraction;
    const y = box.y + box.height / 2;
    // Move onto the track first (a real pointer hovers before it presses), then press and release.
    await this.page.mouse.move(x - 15, y);
    await this.page.mouse.move(x, y, { steps: 5 });
    await this.page.mouse.down();
    await this.page.waitForTimeout(100);
    await this.page.mouse.up();
    await this.page.waitForTimeout(400);
  }

  /** Draw `count` separate short vertical strokes side by side, like the letters of a word.
   * Each stroke is its own path, so erasing one "letter" is countable. Returns their x positions. */
  async drawLetters(count, { x = 400, y = 400, gap = 60, height = 60 } = {}) {
    await this.selectTool('gtPen');
    const xs = [];
    for (let i = 0; i < count; i++) {
      const lx = x + i * gap;
      xs.push(lx);
      await this.drawStroke({ x: lx, y }, { x: lx, y: y + height }, 8);
    }
    return xs;
  }

  /** Drag the eraser (select it first) between two canvas points. */
  async eraseDrag(from, to, steps = 24) {
    await this.selectTool('gtErase');
    await this.drawStroke(from, to, steps);
  }

  /** Pick a background by its data-qa-id suffix (e.g. 'gtGraphCms') from a freshly opened panel. */
  async chooseBackground(optionId) {
    await this.openToolPanel('gtBackground');
    await this.page.locator(`[data-qa-id="toolbar-background-${optionId}"]`).click({ force: true });
    await this.page.waitForTimeout(600);
    await this.closePanelByTappingOutside();
  }

  /** Choose a Shapes-panel entry by its data-qa-id suffix (e.g. 'gtDrawRect') from a freshly opened panel.
   * CONFIRMED LIVE in the previous suite: the tool is not armed for repeated inserts, so this must be
   * called again before every individual shape. */
  async chooseShape(shapeId) {
    await this.openToolPanel('gtShapes');
    await this.page.locator(`[data-qa-id="toolbar-shape-${shapeId}"]`).click({ force: true });
    await this.page.waitForTimeout(500);
    await this.closePanelByTappingOutside();
  }

  /** Every object currently on the canvas (paths, text boxes, images), not just paths. */
  async objectCount() {
    return this.wbSvg.locator('path, foreignObject, image').count();
  }
}

module.exports = { ToolbarPage, TOOL_IDS };
