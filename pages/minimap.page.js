// Page Object for the whiteboard Minimap (Zoom tool -> Minimap button).
//
// CONFIRMED LIVE (probe, 2026-09-26, v 0.0.223):
// - `minimap-container` is always in the DOM; open/closed is its `visible` class.
// - Inside it: a 250x150 <canvas data-qa-id="minimap-canvas">, a `.zoom-level` label ("100%"), Reset View
//   (`minimap-reset-btn`) and Close (`minimap-close-btn`). The Players toggle (`minimap-toggle-players-btn`) is only
//   rendered while a player is open.
// - The viewport rectangle and content markers are painted on the canvas, not DOM elements, so they are read from
//   the canvas pixels (viewportRect / contentPixels below).
// - The main zoom slider runs 25..200 in steps of 25.

class MinimapPage {
  constructor(page) {
    this.page = page;

    this.openBtn = page.locator('[data-qa-id="toolbar-zoom-minimap-btn"]');
    this.container = page.locator('[data-qa-id="minimap-container"]');
    this.canvas = page.locator('[data-qa-id="minimap-canvas"]');
    this.zoomLevel = this.container.locator('.zoom-level');
    this.resetBtn = page.locator('[data-qa-id="minimap-reset-btn"]');
    this.closeBtn = page.locator('[data-qa-id="minimap-close-btn"]');
    this.playersToggleBtn = page.locator('[data-qa-id="minimap-toggle-players-btn"]');
  }

  /** Open through the real UI: Zoom tool panel -> Minimap button. `toolbar` is the ToolbarPage. */
  async open(toolbar) {
    if (await this.isOpen()) return;
    await toolbar.openToolPanel('gtZoom');
    await this.openBtn.click({ force: true });
    await this.waitOpen(true);
    await toolbar.closePanelByTappingOutside();
  }

  async close() {
    if (await this.isOpen()) await this.closeBtn.click({ force: true });
    await this.waitOpen(false);
  }

  async isOpen() {
    return this.container.evaluate((el) => el.classList.contains('visible')).catch(() => false);
  }

  /** Wait until the Minimap is (or is not) open. */
  async waitOpen(open, timeout = 5000) {
    await this.page.waitForFunction(
      (want) => {
        const el = document.querySelector('[data-qa-id="minimap-container"]');
        return !!el && el.classList.contains('visible') === want;
      },
      open,
      { timeout }
    );
  }

  /** The Minimap's own zoom readout as a number (e.g. 150 for "150%"). */
  async zoomPercent() {
    const text = await this.zoomLevel.innerText();
    return Number(text.replace(/[^\d.]/g, ''));
  }

  /** Summarise the canvas pixels: the viewport rectangle (bluish outline pixels) and how many other non-background
   * pixels (content markers) are painted. Background = the most common colour on the canvas. */
  async readCanvas() {
    // CONFIRMED LIVE (2026-09-26): the rectangle is a light-blue outline with a translucent blue fill; content (a pen
    // stroke) is drawn in its own colour. "content" counts pixels that are neither the background, nor the rectangle's
    // outline, nor its fill (both measured from the canvas itself), within a small colour tolerance.
    return this.canvas.evaluate((c) => {
      const { width, height } = c;
      const data = c.getContext('2d').getImageData(0, 0, width, height).data;
      const px = (x, y) => {
        const i = (y * width + x) * 4;
        return [data[i], data[i + 1], data[i + 2], data[i + 3]];
      };
      const mode = (pixels) => {
        const counts = new Map();
        for (const p of pixels) counts.set(p.join(','), (counts.get(p.join(',')) || 0) + 1);
        return [...counts.entries()]
          .sort((m, n) => n[1] - m[1])[0][0]
          .split(',')
          .map(Number);
      };
      const all = [];
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) all.push(px(x, y));
      const bg = mode(all);
      const near = (p, q, tol = 28) => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]) <= tol;
      const isOutline = (p) => p[2] > 150 && p[2] > p[0] + 60 && p[2] > p[1] + 20;
      let minX = Infinity,
        minY = Infinity,
        maxX = -1,
        maxY = -1;
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
          if (isOutline(px(x, y))) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
      const rect = maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
      const inside = [];
      if (rect)
        for (let y = rect.y + 3; y < rect.y + rect.height - 3; y++)
          for (let x = rect.x + 3; x < rect.x + rect.width - 3; x++) inside.push(px(x, y));
      const fill = inside.length ? mode(inside) : bg;
      let content = 0;
      for (const p of all) if (p[3] > 0 && !near(p, bg) && !near(p, fill) && !isOutline(p)) content++;
      return { width, height, rect, content };
    });
  }

  /** True while the panel is shown. CONFIRMED LIVE: closing drops the `visible` class and fades it to opacity 0 (the
   * element and its canvas stay in the page, scaled down), so element visibility alone cannot tell. */
  async isShown() {
    return this.container
      .evaluate((el) => el.classList.contains('visible') && getComputedStyle(el).opacity !== '0')
      .catch(() => false);
  }

  /** Click a point inside the Minimap canvas, given as fractions (0..1) of its width and height. */
  async clickAt(fx, fy) {
    const box = await this.canvas.boundingBox();
    await this.page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
    await this.page.waitForTimeout(500);
  }
}

module.exports = { MinimapPage };
