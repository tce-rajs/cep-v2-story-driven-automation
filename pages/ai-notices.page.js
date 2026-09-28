// Page Object for AI Notices (Magnet -> Notice).
//
// CONFIRMED LIVE (probe, 2026-09-26, v 0.0.232, Class 12A Physics):
// - Choosing Notice puts the whiteboard into capture mode with the banner "Capture the text area to add as your
//   notice's description". Dragging draws a selection with two unlabeled raw-SVG controls: `g[cursor="pointer"]`
//   matches exactly those two while a selection shows -- Approve first, Discard second.
// - Approving a selection over real text shows "We have touched it up for you!" and opens the composer:
//   ai-notices-title-input (AI-written title), ai-notices-description-editor (Quill; `.ql-editor` inside, body = the
//   captured text), ai-notices-recapture-btn, one ai-notices-class-option-{i} / ai-notices-class-checkbox-{i} per class
//   the teacher has, ai-notices-close-btn, ai-notices-send-btn ("Ready to Send"), and the paraphrase / translate /
//   grammar buttons.

class AiNoticesPage {
  constructor(page) {
    this.page = page;

    // CONFIRMED LIVE (2026-09-26): after Recapture the instruction banner can be in the page twice; use the visible one.
    this.captureBanner = page
      .getByText(/capture the text area/i)
      .filter({ visible: true })
      .first();
    this.selectionControls = page.locator('g[cursor="pointer"]');
    this.approveBtn = this.selectionControls.nth(0);
    this.discardBtn = this.selectionControls.nth(1);

    this.titleInput = page.locator('[data-qa-id="ai-notices-title-input"]');
    this.bodyEditor = page.locator('[data-qa-id="ai-notices-description-editor"] .ql-editor');
    this.boldBtn = page.locator('[data-qa-id="ai-notices-description-editor"] .ql-bold, .ql-toolbar .ql-bold').first();
    this.recaptureBtn = page.locator('[data-qa-id="ai-notices-recapture-btn"]');
    this.classOptions = page.locator('[data-qa-id^="ai-notices-class-option-"]');
    this.classCheckboxes = page.locator('[data-qa-id^="ai-notices-class-checkbox-"]');
    this.classCheckbox = (i) => page.locator(`[data-qa-id="ai-notices-class-checkbox-${i}"]`);
    this.classOption = (i) => page.locator(`[data-qa-id="ai-notices-class-option-${i}"]`);
    this.closeBtn = page.locator('[data-qa-id="ai-notices-close-btn"]');
    this.sendBtn = page.locator('[data-qa-id="ai-notices-send-btn"]');

    this.touchedUpToast = page.getByText(/touched it up for you/i);
    this.unableToProcessToast = page.getByText(/unable to process/i);
    this.snackbar = page.locator(
      'mat-snack-bar-container, .mat-mdc-snack-bar-container, .toast-container, [role="alert"]'
    );
  }

  /** Drag a selection between two points given relative to the whiteboard SVG (`wbBox`). */
  async dragSelect(wbBox, from, to) {
    await this.page.mouse.move(wbBox.x + from.x, wbBox.y + from.y);
    await this.page.mouse.down();
    await this.page.mouse.move(wbBox.x + to.x, wbBox.y + to.y, { steps: 10 });
    await this.page.mouse.up();
    await this.selectionControls.first().waitFor({ state: 'attached', timeout: 5000 });
  }

  /** Put real text on the board (for the OCR to read), then Magnet -> Notice and select over it. Leaves the
   * selection waiting for Approve/Discard. `app` is the App (whiteboard, toolbar, magnet). */
  async captureText(app, text = 'Photosynthesis is important') {
    await app.whiteboard.insertTextAndType(300, 300, text);
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(800);
    await app.magnet.choose('notice');
    await this.captureBanner.waitFor({ state: 'visible', timeout: 10000 });
    const box = await app.toolbar.wbSvg.boundingBox();
    await this.dragSelect(box, { x: 250, y: 270 }, { x: 650, y: 345 });
  }

  /** Full path to an open composer: text on the board -> capture -> Approve. Resolves once the title is filled. */
  async openComposer(app, text) {
    await this.captureText(app, text);
    await this.approveBtn.click({ force: true });
    await this.titleInput.waitFor({ state: 'visible', timeout: 30000 });
    await this.page.waitForFunction(
      () => (document.querySelector('[data-qa-id="ai-notices-title-input"]')?.value || '').trim().length > 0,
      null,
      { timeout: 15000 }
    );
  }

  /** CONFIRMED LIVE (2026-09-26): with Virtual Keyboard on (the default), focusing the title opens the on-screen keyboard
   * over the composer's lower half -- its keys sit on top of Close (a click there lands on a key). Blur the input so the
   * keyboard goes away before pressing the composer's own buttons. */
  async hideKeyboard() {
    // CONFIRMED LIVE (2026-09-26): blurring the input does NOT hide it (the keyboard even slides further up, over Close).
    // The keyboard has its own close control (a div.close just above its top edge): wait for it to settle, then use it.
    const kbTop = () =>
      this.page.evaluate(() => {
        const k = [...document.querySelectorAll('.simple-keyboard')].find((e) => e.getBoundingClientRect().height > 0);
        return k ? Math.round(k.getBoundingClientRect().top) : null;
      });
    let last = await kbTop();
    for (let i = 0; i < 10 && last !== null; i++) {
      await this.page.waitForTimeout(300);
      const now = await kbTop();
      if (now === last) break;
      last = now;
    }
    if (last === null || last >= (await this.page.evaluate(() => innerHeight)) - 5) return;
    await this.page.evaluate((top) => {
      const close = [...document.querySelectorAll('div.close')].find((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && Math.abs(r.bottom - top) < 60;
      });
      if (close) close.click();
    }, last);
    await this.page
      .waitForFunction(
        () => {
          const k = [...document.querySelectorAll('.simple-keyboard')].find(
            (e) => e.getBoundingClientRect().height > 0
          );
          return !k || k.getBoundingClientRect().top >= innerHeight - 5;
        },
        null,
        { timeout: 5000 }
      )
      .catch(() => {});
  }

  /** Close the composer the way a teacher would (keyboard out of the way first). */
  async close() {
    await this.hideKeyboard();
    await this.closeBtn.click({ timeout: 5000 });
  }

  async isComposerOpen() {
    return this.titleInput.isVisible().catch(() => false);
  }

  /** Close the composer if open, and leave capture mode if a selection is still showing. */
  async closeAll() {
    // Close itself is covered by the capture overlay (AIN-04-01), so fall back to Escape.
    if (await this.isComposerOpen()) await this.close().catch(() => {});
    if (await this.isComposerOpen()) await this.page.keyboard.press('Escape').catch(() => {});
    if ((await this.selectionControls.count()) === 2) await this.discardBtn.click({ force: true }).catch(() => {});
    await this.page.keyboard.press('Escape').catch(() => {});
  }

  async checkedClassCount() {
    return this.classCheckboxes.evaluateAll((els) => els.filter((e) => e.checked).length);
  }

  /** Untick every class (clicks the label of each ticked class). */
  async untickAllClasses() {
    const n = await this.classCheckboxes.count();
    for (let i = 0; i < n; i++) {
      if (await this.classCheckbox(i).isChecked()) await this.classOption(i).click({ force: true });
    }
  }
}

module.exports = { AiNoticesPage };
