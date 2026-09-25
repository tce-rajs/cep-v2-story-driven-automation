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
