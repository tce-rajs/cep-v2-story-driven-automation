// Page Object for Learning Shorts (Magnet -> Learning Shorts).
//
// CONFIRMED LIVE (probe, 2026-09-26, v 0.0.232):
// - The recorder shows learning-shorts-record-start-btn ("videocam") and learning-shorts-exit-btn ("cancel").
// - Record switches it to learning-shorts-record-stop-btn ("stop"). The client runs with Chromium's fake media
//   stream (fixtures/electron-app.js), so recording needs no real camera and no permission prompt.
// - The composer's controls exist in the DOM before a recording is made: learning-shorts-close-btn, -title-input,
//   -discard-btn, -save-playlist-btn, -save-revision-btn, -back-btn. Attachment and class controls are named per the
//   reference suite: -delete-attachment-btn, -recapture-btn, -class-option-{i}, -class-checkbox-{i}, -send-btn.
// - Second entry point: an owned Video card's overflow menu (playlist-asset-overflow-icon-btn) -> Send
//   (playlist-asset-send-btn) opens the same composer with that video attached.

const { AiNoticesPage } = require('./ai-notices.page');

class LearningShortsPage {
  constructor(page) {
    this.page = page;
    const id = (name) => page.locator(`[data-qa-id="learning-shorts-${name}"]`);

    this.recordStartBtn = id('record-start-btn');
    this.recordStopBtn = id('record-stop-btn');
    this.exitBtn = id('exit-btn');

    this.closeBtn = id('close-btn');
    this.backBtn = id('back-btn');
    this.titleInput = id('title-input');
    this.deleteAttachmentBtn = id('delete-attachment-btn');
    this.recaptureBtn = id('recapture-btn');
    this.classOptions = page.locator('[data-qa-id^="learning-shorts-class-option-"]');
    this.classCheckboxes = page.locator('[data-qa-id^="learning-shorts-class-checkbox-"]');
    this.classOption = (i) => id(`class-option-${i}`);
    this.classCheckbox = (i) => id(`class-checkbox-${i}`);
    this.discardBtn = id('discard-btn');
    this.savePlaylistBtn = id('save-playlist-btn');
    this.saveRevisionBtn = id('save-revision-btn');
    this.sendBtn = id('send-btn');
    this.attachment = page
      .locator(
        '[data-qa-id^="learning-shorts-"] video, [data-qa-id="learning-shorts-attachment"], .learning-shorts video'
      )
      .first();

    this.assetOverflowBtn = page.locator('[data-qa-id="playlist-asset-overflow-icon-btn"]');
    this.assetSendBtn = page.locator('[data-qa-id="playlist-asset-send-btn"]');

    this.snackbar = page.locator(
      'mat-snack-bar-container, .mat-mdc-snack-bar-container, .toast-container, [role="alert"]'
    );
  }

  /** Open the recorder (Magnet -> Learning Shorts). `magnet` is the MagnetPage. */
  async openRecorder(magnet) {
    await magnet.choose('learningShorts');
    await this.recordStartBtn.waitFor({ state: 'visible', timeout: 15000 });
  }

  /** Screen recording needs a secure page (https). CONFIRMED LIVE 2026-09-29: 172.18.2.85 serves the app over plain
   * http, so navigator.mediaDevices is undefined and Record throws "Cannot read properties of undefined (reading
   * 'getDisplayMedia')" -- nothing records, for any teacher. Fail with that reason instead of a Stop-button timeout. */
  async assertCanRecord() {
    const secure = await this.page.evaluate(() => window.isSecureContext && !!navigator.mediaDevices);
    if (!secure)
      throw new Error(
        `ENVIRONMENT: screen recording is impossible here -- the app is served over plain http (${this.page.url()}), so the browser gives it no screen-capture access. Needs https on the server.`
      );
  }

  /** Record for `seconds`, stop, and wait for the composer. */
  async record(seconds = 4) {
    await this.assertCanRecord();
    await this.recordStartBtn.click({ force: true });
    await this.recordStopBtn.waitFor({ state: 'visible', timeout: 15000 });
    await this.page.waitForTimeout(seconds * 1000);
    await this.recordStopBtn.click({ force: true });
    await this.titleInput.waitFor({ state: 'visible', timeout: 30000 });
  }

  /** CONFIRMED LIVE (2026-09-26, v 0.0.232): straight after a recording the composer offers only a pre-filled Title
   * ("<teacher> <date>"), Discard, Save to Playlist, "Save & Send as Revision", Back and Close -- no attachment controls,
   * no class list, no Send. Choosing classes and Send appear when an existing short is sent from its Playlist card
   * (Edit mode -> card menu -> Send). This records and saves a short, then opens that fuller composer for it.
   * `app` is the App. Returns the short's title. */
  async openSendComposer(app, seconds = 3) {
    // Reuse a recording already in the composer: a second recording in one session does not start (LS-02-03).
    if (!(await this.isComposerOpen())) {
      await this.openRecorder(app.magnet);
      await this.record(seconds);
    }
    const title = `AutoTest short ${Date.now()}`;
    await this.titleInput.fill(title);
    await this.savePlaylistBtn.click();
    await this.titleInput.waitFor({ state: 'hidden', timeout: 30000 });
    const card = app.playlist.resourceCards.filter({ hasText: title }).first();
    await card.waitFor({ state: 'attached', timeout: 30000 });
    await app.playlist.ensureDrawerVisible();
    await app.playlist.enterEditMode();
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await card.locator('[data-qa-id="playlist-asset-overflow-icon-btn"]').click({ force: true });
    await this.assetSendBtn.filter({ visible: true }).first().click();
    await this.sendBtn.waitFor({ state: 'visible', timeout: 20000 });
    return title;
  }

  async isComposerOpen() {
    return this.titleInput.isVisible().catch(() => false);
  }

  /** Leave whatever Learning Shorts screen is open (composer: Discard; recorder: Exit). */
  async closeAll() {
    if (await this.recordStopBtn.isVisible().catch(() => false))
      await this.recordStopBtn.click({ force: true }).catch(() => {});
    if (await this.isComposerOpen()) {
      await this.discardBtn.click({ force: true }).catch(() => {});
      await this.page
        .locator('mat-dialog-container button, [role="dialog"] button')
        .filter({ hasText: /discard|yes|confirm/i })
        .first()
        .click({ timeout: 2000 })
        .catch(() => {});
    }
    if (await this.exitBtn.isVisible().catch(() => false)) await this.exitBtn.click({ force: true }).catch(() => {});
  }

  async checkedClassCount() {
    return this.classCheckboxes.evaluateAll((els) => els.filter((e) => e.checked).length);
  }

  /** Typing in the title opens the on-screen keyboard over Back (seen on video 2026-09-26); close it first -- same
   * control as in the notice composer. */
  async hideKeyboard() {
    await AiNoticesPage.prototype.hideKeyboard.call(this);
  }
}

module.exports = { LearningShortsPage };
