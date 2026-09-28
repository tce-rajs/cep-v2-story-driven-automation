// Page Object for creating and inspecting whiteboard CONTENT — the three kinds the stories care about
// (WB-06): (a) typed/drawn lines or sentences, (b) an image inserted from Gallery, (c) a drawn shape —
// plus the autosave confirmation and a comparable snapshot of what is on the board.
//
// It composes the Toolbar, Whiteboard and Add Resource page objects rather than duplicating their locators.
// Confirmed live in the previous suite: autosave shows "Saving whiteboard …" then a "Whiteboard Saved! N stroke(s)"
// message; a Gallery-inserted image lands on the canvas but creates no Playlist card.

const { ToolbarPage } = require('./toolbar.page');
const { WhiteboardPage } = require('./whiteboard.page');
const { AddResourcePage } = require('./add-resource.page');

class WhiteboardContent {
  constructor(page) {
    this.page = page;
    this.toolbar = new ToolbarPage(page);
    this.whiteboard = new WhiteboardPage(page);
    this.addResource = new AddResourcePage(page);
  }

  /** (a) A drawn line plus a typed sentence carrying `tag`, so this content is recognisable later. */
  async addLines(tag, { x = 300, y = 300 } = {}) {
    await this.toolbar.penStroke({ x, y }, { x: x + 220, y: y + 30 });
    await this.whiteboard.insertTextAndType(x, y + 120, `Line ${tag}`);
    await this.toolbar.selectTool('gtSelect');
  }

  /** (c) A drawn rectangle. */
  async addShape({ x = 800, y = 300 } = {}) {
    await this.toolbar.chooseShape('gtDrawRect');
    await this.toolbar.drawStroke({ x, y }, { x: x + 180, y: y + 120 }, 10);
    await this.toolbar.selectTool('gtSelect');
  }

  /** (b) The first image in the Gallery, inserted onto the canvas. */
  async addGalleryImage() {
    const ar = this.addResource;
    const { stillStuck } = await ar.openPickerReliably(ar.actions.gallery);
    if (stillStuck) throw new Error('Add Resource picker never became clickable (known intermittent bug)');
    await ar.actions.gallery.click({ force: true });
    await ar.galleryImageCards.first().waitFor({ state: 'visible', timeout: 15000 });
    await ar.galleryImageCards.first().click({ force: true });
    await this.page.waitForTimeout(1500);
    // If the Gallery is still showing after the insert, close it so the canvas is reachable again.
    if (await ar.galleryCloseBtn.isVisible().catch(() => false)) {
      await ar.galleryCloseBtn.click({ force: true });
    }
  }

  /** Add one of each content type. */
  async addAll(tag) {
    await this.addLines(tag);
    await this.addShape();
    await this.addGalleryImage();
  }

  /** The part of the board a teacher writes on: clear of the header/logo (top-left), the toolbar (right), the side
   * buttons (left) and the class bar / Playlist strip (bottom). Canvas-relative pixels. */
  async writingArea() {
    const box = await this.toolbar.wbSvg.boundingBox();
    return { x: 150, y: 110, width: Math.min(box.width - 450, 1500), height: Math.min(box.height - 330, 700) };
  }

  /** Handwrite pre-laid-out pages (pages/lib/handwriting.js layoutHandwriting) with the Pen, like a teacher: one
   * joined stroke per word, then its dots and crosses. Between pages `nextPage(pageIndex)` is called (the caller pans
   * to fresh board space). Returns how long each word took, in ms, to spot the board slowing down. */
  async writeHandwriting(pages, { nextPage, draw, step = 4 } = {}) {
    const { densify } = require('./lib/handwriting');
    const box = await this.toolbar.wbSvg.boundingBox();
    const timings = [];
    // `draw(points)` lets the caller write with a finger or a stylus (pages/touch-input.js); the default is the mouse,
    // sent straight to the browser (page.mouse makes every move a tracked step: an 800-word session took hours).
    if (!draw) {
      const { TouchInput } = require('./touch-input');
      this.directInput = this.directInput || new TouchInput(this.page);
    }
    const drawStroke = draw || ((pts) => this.directInput.mouseStroke(pts));
    await this.toolbar.selectTool('gtPen');
    for (let p = 0; p < pages.length; p++) {
      if (p > 0 && nextPage) {
        await nextPage(p);
        await this.toolbar.selectTool('gtPen');
      }
      for (const word of pages[p].words) {
        const t0 = Date.now();
        for (const stroke of word.strokes) {
          // `step`: pen points every N px (4 = smooth; 6 keeps an 800-word session to about half an hour).
          await drawStroke(densify(stroke, step).map((pt) => ({ x: box.x + pt.x, y: box.y + pt.y })));
        }
        timings.push({ word: word.text, ms: Date.now() - t0, page: p });
      }
    }
    return timings;
  }

  /** Pan the board with the Pan tool so the view moves up by `dy` px (fresh space appears below). */
  async panUp(dy) {
    await this.toolbar.selectTool('gtPan');
    const box = await this.toolbar.wbSvg.boundingBox();
    const x = box.x + box.width / 2;
    const from = box.y + Math.min(box.height - 200, dy + 150);
    await this.page.mouse.move(x, from);
    await this.page.mouse.down();
    for (let i = 1; i <= 20; i++) await this.page.mouse.move(x, from - (dy * i) / 20);
    await this.page.mouse.up();
    await this.page.waitForTimeout(500);
  }

  /** Pan down past everything already written, so new writing lands on fresh board space (a board that is never
   * cleared keeps what earlier sessions wrote). `pan(dy)` does one pan move (mouse or two fingers); default mouse. */
  async panBelowExistingWriting(pan) {
    const box = await this.toolbar.wbSvg.boundingBox();
    const area = await this.writingArea();
    const top = box.y + area.y;
    const doPan = pan || ((dy) => this.panUp(dy));
    for (let i = 0; i < 40; i++) {
      const bottom = await this.toolbar.paths.evaluateAll((els) =>
        els.reduce((m, e) => Math.max(m, e.getBoundingClientRect().bottom), -Infinity)
      );
      if (!Number.isFinite(bottom) || bottom < top - 10) return;
      await doPan(Math.min(area.height, bottom - top + 60));
    }
  }

  /** Start recording every autosave message ("Saving whiteboard …" / "Whiteboard Saved! N stroke(s)") with the time
   * it appeared, so a long session can show autosave kept up. Read them back with savedMessages(). */
  async startSaveLog() {
    await this.page.evaluate(() => {
      window.__wbSaveLog = [];
      let last = '';
      const check = () => {
        const text = (document.body.innerText.match(/Whiteboard Saved![^\n]*|Saving whiteboard[^\n]*/i) || [''])[0];
        if (text && text !== last) window.__wbSaveLog.push({ at: Date.now(), text });
        last = text;
      };
      window.__wbSaveObserver = new MutationObserver(check);
      window.__wbSaveObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
    });
  }

  async savedMessages() {
    return this.page.evaluate(() => window.__wbSaveLog || []);
  }

  /** The top-centre success message. Every scenario waits for THIS, never an arbitrary timer. */
  async waitForSaved(timeout = 30000) {
    await this.toolbar.savedToast.first().waitFor({ state: 'visible', timeout });
  }

  /** Everything on the board, in a form two snapshots can be compared with toEqual().
   * `paths` includes drawn shapes and strokes; `texts` are the text boxes' contents. */
  async snapshot() {
    await this.toolbar.wbSvg.waitFor({ state: 'visible', timeout: 15000 });
    await this.toolbar.waitForBoardToSettle();
    return this.page.evaluate(() => {
      const svg = document.querySelector('[data-qa-id="wb-drawing-container"] svg');
      const texts = [...svg.querySelectorAll('foreignObject.text-element')]
        .map((el) => (el.textContent || '').trim())
        .sort();
      return {
        paths: svg.querySelectorAll('path').length,
        images: svg.querySelectorAll('image').length,
        texts,
      };
    });
  }

  /** The `d` attribute of every drawn path — a fingerprint of the exact geometry on the board. */
  async pathGeometry() {
    return this.toolbar.paths.evaluateAll((els) => els.map((e) => e.getAttribute('d')));
  }

  /** The identity, position and size of every image on the board. `snapshot()` only counts images, so a reload that
   * restores the right COUNT but the WRONG image (or shifts/resizes it) passes snapshot() unnoticed — this catches
   * that. CONFIRMED LIVE: the SVG <image> element carries its href as `xlink:href`, not `href`. */
  async imageFingerprint() {
    return this.page.evaluate(() => {
      const svg = document.querySelector('[data-qa-id="wb-drawing-container"] svg');
      return [...svg.querySelectorAll('image')]
        .map((img) => ({
          href: img.getAttribute('xlink:href') || img.getAttribute('href'),
          x: img.getAttribute('x'),
          y: img.getAttribute('y'),
          width: img.getAttribute('width'),
          height: img.getAttribute('height'),
        }))
        .sort((a, b) => (a.href || '').localeCompare(b.href || ''));
    });
  }

  /** A pen stroke with no settling waits at all, for volume tests. */
  async rapidStroke(from, to) {
    const box = await this.toolbar.wbSvg.boundingBox();
    await this.page.mouse.move(box.x + from.x, box.y + from.y);
    await this.page.mouse.down();
    await this.page.mouse.move(box.x + (from.x + to.x) / 2, box.y + (from.y + to.y) / 2);
    await this.page.mouse.move(box.x + to.x, box.y + to.y);
    await this.page.mouse.up();
  }

  /** Percentage shown under the Zoom tool, e.g. 100 for "100%". */
  async zoomPercent() {
    const text = (await this.toolbar.tool('gtZoom').innerText()) || '';
    const match = text.match(/(\d+)\s*%/);
    return match ? Number(match[1]) : null;
  }
}

module.exports = { WhiteboardContent };
