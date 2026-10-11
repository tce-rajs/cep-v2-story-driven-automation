// Page Object for the Add Resource module: the "+" picker (shared with
// Playlist's own picker) plus each of its 6 source flows -- Create,
// Library, Gallery, Dropit, AI-Assist, Whiteboard.
//
// Locator strategy: prefer data-qa-id. Create's own form has NONE at all
//  -- it's addressed via Angular's formcontrolname
// attributes instead, scoped to its unique <app-add-custom-asset> element.

const TEXT_FILE = { name: 'autotest.txt', mimeType: 'text/plain', buffer: Buffer.from('automated test file') };
const PNG_FILE = {
  name: 'autotest.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
  ),
};

class AddResourcePage {
  constructor(page) {
    this.page = page;

    // --- Entry picker (same one Playlist opens via its floating "+") ---
    this.addResourcesTrigger = page.locator('[data-qa-id="add-resource-trigger"]');
    this.addResourcesCloseBtn = page.locator('[data-qa-id="add-resource-close-btn"]');
    this.actions = {
      create: page.locator('[data-qa-id="add-resource-action-create"]'),
      library: page.locator('[data-qa-id="add-resource-action-library"]'),
      gallery: page.locator('[data-qa-id="add-resource-action-gallery"]'),
      dropit: page.locator('[data-qa-id="add-resource-action-dropit"]'),
      aiAssist: page.locator('[data-qa-id="add-resource-action-ai-assist"]'),
      whiteboard: page.locator('[data-qa-id="add-resource-action-whiteboard"]'),
    };

    // --- Create form (no data-qa-ids at all -- uses formcontrolname) ---
    // <app-add-custom-asset> itself is a zero-size wrapper element
    //  -- its child .add-custom-asset div
    // is the actual visible, positioned container.
    this.createForm = page.locator('app-add-custom-asset .add-custom-asset');
    this.createSubtitle = this.createForm.locator('.sub-title');
    this.titleInput = this.createForm.locator('input[formcontrolname="title"]');
    this.titleErrorText = this.createForm.locator('.invalid-file', { hasText: /title required/i });
    this.gradeSubjectInput = this.createForm.locator('input[formcontrolname="grade_subject"]');
    this.chapterTopicInput = this.createForm.locator('input[formcontrolname="chapter_topic"]');
    this.fileInput = this.createForm.locator('input[type="file"]');
    this.shareToggle = this.createForm.locator('mat-slide-toggle[formcontrolname="share"]');
    this.shareToggleButton = this.shareToggle.locator('button[role="switch"]');
    this.cancelBtn = this.createForm.getByRole('button', { name: 'Cancel' });
    this.submitBtn = this.createForm.getByRole('button', { name: 'Submit' });

    // --- Library ---
    this.libraryPopup = page.locator('.tce-search-library-wrapper');
    this.libraryCloseBtn = page.locator('[data-qa-id="tce-library-close-btn"]');
    this.librarySearchInput = page.locator('[data-qa-id="tce-library-search-input"]');
    this.libraryClearBtn = page.locator('[data-qa-id="tce-library-clear-btn"]');
    this.librarySearchBtn = page.locator('[data-qa-id="tce-library-search-btn"]');
    this.libraryResults = page.locator('[data-qa-id="tce-library-resource-card"]');
    this.libraryResultByIndex = (i) => page.locator(`[data-qa-id="tce-library-resource-${i}"]`);
    this.libraryLoadMoreBtn = page.locator('[data-qa-id="tce-library-load-more"]');
    // Clicking a result opens a preview first; attaching happens from there.
    this.libraryPdfAddToPlaylistBtn = page.locator('[data-qa-id="tce-library-pdf-add-playlist-btn"]');
    this.libraryPdfCloseBtn = page.locator('[data-qa-id="tce-library-pdf-close-btn"]');
    // The X that closes ANY result's preview (back to the result list) is this one -- the
    // "pdf" id above is not shown for the previews seen. Without closing it, later clicks land on the open overlay.
    this.libraryPreviewCloseBtn = page.locator('[data-qa-id="tce-library-tce-close-btn"]');

    // --- Gallery ---
    this.galleryCloseBtn = page.locator('[data-qa-id="gallery-close-btn"]');
    this.gallerySubjectSelect = page.locator('[data-qa-id="gallery-subject-select"]');
    this.galleryFilterSelect = page.locator('[data-qa-id="gallery-filter-select"]');
    this.gallerySearchInput = page.locator('[data-qa-id="gallery-search-input"]');
    this.gallerySearchClearBtn = page.locator('[data-qa-id="gallery-search-clear-btn"]');
    this.gallerySearchBtn = page.locator('[data-qa-id="gallery-search-btn"]');
    this.galleryImageCards = page.locator('[data-qa-id^="gallery-image-card-"]');
    this.galleryLoadMoreBtn = page.locator('[data-qa-id="gallery-load-more"]');

    // --- Dropit ---
    this.dropitCloseBtn = page.locator('[data-qa-id="drop-it-close-btn"]');
    // The actual pairing QR is a <canvas> inside .qrcode --
    // NOT the .dropit FAB action-card's own <img src="qr-code.png"> icon,
    // which is a different, decorative element that a naive `img[src*=qr]`
    // selector can accidentally match instead.
    this.dropitQrCanvas = page.locator('.qrcode canvas');
    this.dropitConnectionStatus = page.locator('.status.connection-state');
    this.dropitTransferStatus = page.locator('.status.transfer-status');
    this.dropitUploadStatus = page.locator('.status.upload-status');

    // --- AI-Assist ---
    this.aiAssistCloseBtn = page.locator('[data-qa-id="ai-assist-close-btn"]');
    this.aiAssistMinimizeBtn = page.locator('[data-qa-id="ai-assist-minimize-btn"]');
    this.aiAssistExerciseCheckboxes = page.locator('[data-qa-id^="ai-assist-exercise-checkbox-"]');
    // Videos tab.
    this.aiAssistVideoThumbs = page.locator('[data-qa-id^="ai-assist-video-thumb-"]');
    this.aiAssistAddToPlaylistBtn = page.locator('[data-qa-id="ai-assist-add-playlist-btn"]');
    this.aiAssistVideoCloseBtn = page.locator('[data-qa-id="ai-assist-video-close-btn"]');
    // Left-side tab list (no confirmed data-qa-id -- text-based, matching
    // the existing convention already used successfully for entry-state
    // checks in dropit-ai-assist.spec.js).
    // "Exercise" also matches a second element (an <h5>
    // heading, likely inside the Exercise tab's own content area) once
    // content has rendered -- a plain getByText throws a strict-mode
    // violation. `.first()` resolves it (the tab-list label renders before
    // the heading in DOM order).
    this.aiAssistTabExercise = page.getByText('Exercise', { exact: true }).first();
    this.aiAssistTabVideos = page.getByText('Videos', { exact: true }).first();
    this.aiAssistTabTeachingTips = page.getByText('Teaching Tips', { exact: true }).first();
    this.aiAssistExerciseHeaderText = page.locator('.exercise-header, .instruction-text').first();
    // AI Assist can return an error screen instead of content.
    this.aiAssistErrorScreen = page.locator('.aierrorscreen');
    this.aiAssistErrorMessage = page.locator('.aierrorscreen-message');

    // --- Whiteboard action (opens a Save-to-Playlist/Download-PDF card for
    // the CURRENT whiteboard's content, not a new whiteboard). ---
    this.whiteboardSavePlaylistBtn = page.locator('[data-qa-id="add-resource-whiteboard-save-playlist-btn"]');
    this.whiteboardDownloadPdfBtn = page.locator('[data-qa-id="add-resource-whiteboard-download-pdf-btn"]');
  }

  /** Tick the n-th AI Assist exercise question. Each option is a <mat-checkbox> wrapping a native
   * input[type=checkbox]; Playwright's check() on the wrapper element never settles, so the inner input is used. */
  async selectExercise(index = 0) {
    await this.aiAssistExerciseCheckboxes.nth(index).waitFor({ state: 'visible', timeout: 20000 });
    await this.page.waitForTimeout(1500); // let the question list finish rendering before selecting
    await this.aiAssistExerciseCheckboxes.nth(index).locator('input[type="checkbox"]').check({ force: true });
  }

  async openPicker() {
    await this.addResourcesTrigger.click();
  }

  /** Opens the Add Resources picker so that `actionLocator` is clickable. The picker's popup can render with
   * `pointer-events: none` on every ancestor: visible, but a click passes straight through to the whiteboard. Closing
   * and reopening does not recover it; a page reload does, so this reloads (up to `maxReloadAttempts` times) when needed.
   * Returns `{ stillStuck }`. */
  async openPickerReliably(actionLocator, maxReloadAttempts = 3) {
    for (let attempt = 0; attempt < maxReloadAttempts; attempt++) {
      if (attempt > 0) {
        await this.page.reload();
        await this.page.locator('[data-qa-id="toolbar-user-avatar"]').waitFor({ state: 'visible', timeout: 15000 });
        await this.page.waitForTimeout(1000);
      }
      // "not pointer-events:none" is not enough -- the picker can also end up toggled CLOSED (options in
      // the DOM but hidden), which that check still calls clickable. Require the option to be actually on screen too.
      const usable = () =>
        actionLocator
          .evaluate((el) => {
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            return cs.pointerEvents !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
          })
          .catch(() => false);
      await this.addResourcesTrigger.click({ force: true });
      await this.page.waitForTimeout(900);
      if (await usable()) return { reloadNeeded: attempt > 0 };
      // Still not usable: the first click may have toggled it shut -- click once more before resorting to a reload.
      await this.addResourcesTrigger.click({ force: true }).catch(() => {});
      await this.page.waitForTimeout(900);
      if (await usable()) return { reloadNeeded: attempt > 0 };
      await this.addResourcesTrigger.click({ force: true }).catch(() => {}); // close before reload/retry
      await this.page.waitForTimeout(400);
    }
    return { reloadNeeded: true, stillStuck: true };
  }

  /** Open the picker and choose one of its options ('create' | 'library' | 'gallery' | 'dropit' | 'aiAssist' |
   * 'whiteboard'), using openPickerReliably() so the picker is clickable. */
  async openAction(name) {
    const { stillStuck } = await this.openPickerReliably(this.actions[name]);
    if (stillStuck) throw new Error('Add Resource picker did not become clickable');
    await this.actions[name].click({ force: true });
  }

  /** Create an asset through Add Resource -> Create and submit it. Used wherever a test needs a Playlist asset
   * it owns and may safely remove again. (The Whiteboard entry's "Save to Playlist" does not create an asset, so it is
   * not used for this.) The new card is identifiable by `title`.
   * `file` is a Playwright file payload; the default is a tiny text file. */
  async createAsset(title, file = TEXT_FILE) {
    await this.openAction('create');
    await this.createForm.waitFor({ state: 'visible', timeout: 10000 });
    await this.titleInput.fill(title);
    await this.fileInput.setInputFiles(file);
    await this.submitBtn.click();
  }

  /** Reads the DropIt pairing QR (dropitQrCanvas) and decodes it to the real pairing URL it encodes, using jsQR
   * (a dependency-free browser QR decoder, injected directly into the page). The QR
   * decodes to https://tce-drop-it.web.app/cepweb-dropit/<token> -- a real, public web page a second browser
   * context can open directly (see pages/dropit-companion.page.js), not something requiring an actual phone.
   * Returns null if the canvas can't be read or decoded. */
  async decodeDropitQrUrl() {
    await this.dropitQrCanvas.waitFor({ state: 'visible', timeout: 15000 });
    await this.page.addScriptTag({ path: require.resolve('jsqr/dist/jsQR.js') });
    return this.page.evaluate(() => {
      const canvas = document.querySelector('.qrcode canvas');
      if (!canvas) return null;
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // eslint-disable-next-line no-undef -- jsQR is a global attached by the injected script tag above
      const result = jsQR(imageData.data, imageData.width, imageData.height);
      return result ? result.data : null;
    });
  }

  createTextAsset(title) {
    return this.createAsset(title, TEXT_FILE);
  }

  /** Create an asset from a 1x1 PNG — a real, openable image, unlike the text file. */
  createImageAsset(title) {
    return this.createAsset(title, PNG_FILE);
  }
}

module.exports = { AddResourcePage, TEXT_FILE, PNG_FILE };
