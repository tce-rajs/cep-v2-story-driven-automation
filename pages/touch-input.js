// Real touch and stylus input for the classroom panel, sent through Chrome DevTools Protocol -- the same input path a
// touch screen or pen digitiser uses (Input.dispatchTouchEvent / Input.dispatchMouseEvent with pointerType "pen"), so
// the app receives genuine touch/pen pointer events, not mouse events dressed up.
// Coordinates are page (CSS) pixels, like page.mouse.

class TouchInput {
  constructor(page) {
    this.page = page;
    this.cdp = null;
  }

  async session() {
    if (!this.cdp) this.cdp = await this.page.context().newCDPSession(this.page);
    return this.cdp;
  }

  /** Switch touch support off again and detach. CONFIRMED LIVE (2026-09-27): touch emulation stays on for the window
   * after the test, and the next test's PIN sign-in then never completes -- always call this in afterEach. */
  async dispose() {
    if (!this.cdp) return;
    if (this.touchEnabled)
      await this.cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false }).catch(() => {});
    await this.cdp.detach().catch(() => {});
    this.cdp = null;
    this.touchEnabled = false;
  }

  async touch(type, points) {
    const cdp = await this.session();
    // Touch support is switched on only when a finger is used, so mouse/pen sessions look like a normal PC.
    if (!this.touchEnabled) {
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 10 });
      this.touchEnabled = true;
    }
    await cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: points.map((p, i) => ({ x: p.x, y: p.y, id: p.id ?? i, radiusX: 8, radiusY: 8, force: 1 })),
    });
  }

  /** A finger tap. */
  async tap(x, y, holdMs = 60) {
    await this.touch('touchStart', [{ x, y }]);
    await this.page.waitForTimeout(holdMs);
    await this.touch('touchEnd', []);
  }

  /** A finger held down in place (long press). */
  async longPress(x, y, holdMs = 900) {
    return this.tap(x, y, holdMs);
  }

  /** One finger dragged along `points` ([{x,y}], page pixels). */
  async fingerStroke(points, stepDelay = 8) {
    await this.touch('touchStart', [points[0]]);
    // One move at a time: sending a whole stroke as one burst makes Chrome merge the moves, and the app then draws a
    // jagged, simplified line (CONFIRMED LIVE 2026-09-27: 800 words came out as zig-zags and 223 of 1,480 strokes).
    for (const p of points.slice(1)) {
      await this.touch('touchMove', [p]);
      if (stepDelay) await this.page.waitForTimeout(stepDelay);
    }
    await this.touch('touchEnd', []);
  }

  /** Two fingers moving together by (dx, dy) -- a two-finger pan. */
  async twoFingerPan(x, y, dx, dy, steps = 15) {
    const a = { x, y, id: 0 };
    const b = { x: x + 120, y, id: 1 };
    await this.touch('touchStart', [a, b]);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      await this.touch('touchMove', [
        { ...a, x: a.x + dx * t, y: a.y + dy * t },
        { ...b, x: b.x + dx * t, y: b.y + dy * t },
      ]);
      await this.page.waitForTimeout(16);
    }
    await this.touch('touchEnd', []);
  }

  /** Two fingers moving apart (scale > 1, zoom in) or together (scale < 1) around (cx, cy). */
  async pinch(cx, cy, scale, steps = 15) {
    const start = 80;
    const end = start * scale;
    await this.touch('touchStart', [
      { x: cx - start, y: cy, id: 0 },
      { x: cx + start, y: cy, id: 1 },
    ]);
    for (let i = 1; i <= steps; i++) {
      const d = start + ((end - start) * i) / steps;
      await this.touch('touchMove', [
        { x: cx - d, y: cy, id: 0 },
        { x: cx + d, y: cy, id: 1 },
      ]);
      await this.page.waitForTimeout(16);
    }
    await this.touch('touchEnd', []);
  }

  /** A mouse stroke along `points`, sent straight to the browser. Much faster than page.mouse for long sessions (each
   * page.mouse.move is a tracked Playwright step; 58,000 of them take hours), same events for the app. */
  async mouseStroke(points) {
    return this.penStroke(points, { pointerType: 'mouse', force: 0 });
  }

  /** A pen (stylus) stroke along `points`, with pen pressure. */
  async penStroke(points, { force = 0.6, stepDelay = 0, pointerType = 'pen' } = {}) {
    const cdp = await this.session();
    const ev = (type, p, extra = {}) =>
      cdp.send('Input.dispatchMouseEvent', {
        type,
        x: p.x,
        y: p.y,
        button: 'left',
        buttons: type === 'mouseReleased' ? 0 : 1,
        clickCount: 1,
        pointerType,
        force,
        ...extra,
      });
    await ev('mouseMoved', points[0], { buttons: 0 });
    await ev('mousePressed', points[0]);
    for (const p of points.slice(1)) {
      await ev('mouseMoved', p); // one at a time (see fingerStroke)
      if (stepDelay) await this.page.waitForTimeout(stepDelay);
    }
    await ev('mouseReleased', points[points.length - 1]);
  }

  /** The pen drawing a stroke while the side of the hand (palm) rests on the screen: the palm touch starts first and
   * stays down for the whole stroke, as happens when a teacher writes on a panel. */
  async penStrokeWithPalm(points, palm) {
    await this.touch('touchStart', [{ ...palm, id: 9 }]);
    await this.penStroke(points);
    await this.touch('touchEnd', []);
  }
}

module.exports = { TouchInput };
