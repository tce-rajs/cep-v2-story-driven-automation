// Page Object for the Player module -- every resource-type player opened
// from a Playlist card: Quiz, Video, Worksheet, Image, Weblink, Code
// Editor, Ebook, Checkpoints, TCE, Notes, Unsupported.
//
// Selectors use data-qa-id where the app provides one, and stable class names or text otherwise.

class PlayerPage {
  constructor(page) {
    this.page = page;

    // --- Generic player chrome (shared across most sub-types) ---
    this.closeIcon = page
      .locator('img[alt="close-btn"], img[src*="closeIcon.png"], button.closeIcon')
      .filter({ visible: true });

    // --- Quiz ---
    // The quiz-card wrapper is
    // playlist-quiz-card, a DIFFERENT data-qa-id from the generic
    // playlist-resource-card/-asset-card used by other resource types --
    // and the wrapper itself is a no-op, the actual click target is the
    // inner .resource-card div.
    this.quizCards = page.locator('[data-qa-id="playlist-quiz-card"] .resource-card');
    this.quizLaunchScreenBtn = page.getByRole('button', { name: /launch air card/i });
    // An intermediate screen sits between "Launch AIR Card" and the first question: "Enter the class strength to
    // kick off the quiz adventure!", with a student-count slider/input and a "Start" button.
    this.quizClassStrengthStartBtn = page.getByRole('button', { name: /start/i });
    this.quizRenderer = page.locator('lib-quiz-renderer');
    this.quizCloseBtn = page.locator('button.closeIcon.btn:not(.m-r4)').first();
    this.quizSplitScreenBtn = page.locator('button.closeIcon.btn.m-r4').first();
    // A quiz opens with an "AIR card" popup that counts down ~5s. Left alone, it opens the
    // normal ATTEMPT mode -- lib-quiz-renderer, .qb-mcq question, radio options in .quiz-options-group, Submit Answer /
    // Show Answer, the pager -- which is what these locators (and the PLR-01/02 stories) are about. Clicking "Launch AIR
    // Card" instead switches to the camera-driven AIR mode (the air* locators below).
    this.quizQuestion = page.locator('.qb-mcq.qb-tempalete');
    this.quizOptions = page.locator('.quiz-options-group .option-content');
    this.quizOptionLabels = page.locator('.quiz-options-group .option-content .option-label');
    this.quizCorrectOptions = page.locator('.quiz-options-group .option-content.correct');
    this.quizIncorrectOptions = page.locator('.quiz-options-group .option-content.incorrect');
    this.quizSubmitBtn = page.getByRole('button', { name: 'Submit Answer' });
    this.quizShowAnswerBtn = page.getByRole('button', { name: 'Show Answer' });
    this.quizNextQuestionBtn = page.getByRole('button', { name: 'Next Question' });
    this.quizQuestionNumbers = page.locator('li.page-item.number-item');
    this.quizCurrentQuestionNumber = page.locator('li.page-item.number-item.current');
    this.quizPrevControl = page.locator('li.page-item.previous-item');
    this.quizNextControl = page.locator('li.page-item.next-item');
    // AIR-card mode (after "Launch AIR Card"): h2.questionText, div.options > div.option, a "Capture" button and a
    // "0 / N" responses counter; the teacher cannot select or submit an answer here.
    this.airOptions = page.locator('.options .option');
    this.airCaptureBtn = page.getByRole('button', { name: /capture/i });

    // --- Video ---
    // Identify Video
    // resources by their type-icon, not the Playlist's own "Video" filter
    // (that filter can silently do nothing).
    this.videoCards = page.locator(
      '[data-qa-id="playlist-resource-card"]:has(img.type-icon[src*="ic.AVMediaVideo.svg"]), [data-qa-id="playlist-asset-card"]:has(img.type-icon[src*="ic.AVMediaVideo.svg"])'
    );
    this.videoFrame = page.locator('iframe').first();
    this.videoPlayToggle = page.locator('.vjs-play-control');
    // The video plays in an about:blank iframe holding a plain <video> and its own control
    // bar (#nav-playButton, a scrubber, volume, duration) -- not video.js, so the vjs-* locators above never match.
    this.videoIframe = page.frameLocator('iframe').first();
    this.videoNavPlayBtn = this.videoIframe.locator('#nav-playButton');
    this.videoElement = this.videoIframe.locator('video');
    this.videoProgressBar = page.locator('.vjs-progress-control .vjs-progress-holder');
    this.videoMuteToggle = page.locator('.vjs-mute-control');
    this.videoFullscreenToggle = page.locator('.vjs-fullscreen-control');
    // Script errors from the video player (e.g. "ReferenceError: targetContainer is not defined" from
    // tce-player-hybrid.js) are caught with page.on('pageerror') in the spec, not with a locator.

    // --- Worksheet (PDF) ---
    this.worksheetCards = page.locator(
      '[data-qa-id="playlist-resource-card"]:has(img.type-icon[src*="ic.Worksheet.svg"]), [data-qa-id="playlist-asset-card"]:has(img.type-icon[src*="ic.Worksheet.svg"])'
    );
    this.worksheetHeader = page.locator('.pdf-header, .worksheet-header').first();
    this.worksheetPrevPage = page.locator('li.page-item.previous-item .mypage-link, .previous-item');
    this.worksheetNextPage = page.locator('li.page-item.next-item .mypage-link, .pagination-next .mypage-link');
    // The "Go to Page" box is a plain input[type=text] with no placeholder, next to the GO button.
    this.worksheetGoToPageInput = page
      .locator('input[type="text"], input[placeholder*="page" i], input[type="number"]')
      .filter({ visible: true })
      .first();
    // The up / down arrows at the left end of the same toolbar.
    this.worksheetUpBtn = page.locator('button.upbutton');
    this.worksheetDownBtn = page.locator('button.downbutton');
    this.worksheetGoBtn = page.getByRole('button', { name: /^go$/i });
    this.worksheetZoomInBtn = page.locator('[class*="zoom-in" i], [aria-label*="zoom in" i]').first();
    this.worksheetZoomOutBtn = page.locator('[class*="zoom-out" i], [aria-label*="zoom out" i]').first();
    this.worksheetOrientationToggle = page.locator('.portraitLandscapeToggleIcon');
    this.worksheetPrintIcon = page.locator('.printIcon');
    this.worksheetAnswerKeyBtn = page.locator('.worksheet_btn');
    this.worksheetAnnotationLayer = page.locator('svg.annotation-layer, .annotation-layer');

    // --- Image ---
    this.imageCards = page.locator(
      '[data-qa-id="playlist-resource-card"]:has(img.type-icon[src*="ic.image" i]), [data-qa-id="playlist-asset-card"]:has(img.type-icon[src*="ic.image" i])'
    );
    this.imageWrapper = page.locator('.player.image-player');
    this.imageGalleryImg = page.locator('.image-gallery img.g-image-item');
    this.imageCloseBtn = page.locator(".image-close-btn img, img[alt='close-btn']").filter({ visible: true });

    // --- Weblink ---
    this.weblinkCards = page.locator(
      '[data-qa-id="playlist-resource-card"]:has(img.type-icon[src*="weblink" i]), [data-qa-id="playlist-asset-card"]:has(img.type-icon[src*="weblink" i])'
    );
    this.weblinkWrapper = page.locator('.player.weblink-player');
    this.weblinkIframe = page.locator('.weblink-wrapper iframe');
    this.weblinkCloseBtn = page.locator(".weblink-close-btn, img[alt='close-btn']").filter({ visible: true });
    this.weblinkPlayIconOverlay = this.weblinkWrapper
      .locator('[class*="play-icon" i], [class*="play-overlay" i]')
      .first();
    // "Watch on YouTube" is rendered
    // INSIDE the cross-origin YouTube embed iframe itself (YouTube's own
    // native embed chrome), NOT the app's own DOM -- confirmed via
    // elementFromPoint at the button's own screen coordinates resolving to
    // the <iframe> element. Playwright can query into the cross-origin
    // iframe with frameLocator(). Scoped to the weblink iframe
    // specifically since other iframes may exist elsewhere on the page.
    this.weblinkWatchOnYoutubeBtn = page.frameLocator('.weblink-wrapper iframe').getByText(/watch on/i);
    this.weblinkChainIcon = this.weblinkWrapper.locator('[class*="link-icon" i], [class*="chain" i]').first();

    // --- Code Editor ---
    this.codeEditorComponent = page.locator('tce-code-main');
    this.monacoEditor = page.locator('.monaco-editor').first();
    this.monacoViewLines = page.locator('.view-lines').first();
    this.codeLanguageTabs = page.locator('.webdev-tab');
    this.codeRunBtn = page.locator('.generalBtns.runBtn');
    this.codeOutputFrame = this.codeEditorComponent.locator('iframe');
    this.codeSettingsGear = page.locator('.gear-icon');
    this.codeSettingsPanel = page.locator('.settingView.floatingMenu');
    this.codeTextSizeSelect = page.locator('select#fontSize');
    this.codeThemeSelect = page.locator('select#themeSelect');

    // --- Ebook ---
    this.ebookTriggerBtn = page.locator('[data-qa-id="playlist-e-book-btn"]');
    this.ebookLaunchBtn = page.locator('[data-qa-id="playlist-e-book-launch-btn"]');
    // The prefix also matches the drawer's own toggle button (player-ebook-chapter-drawer-toggle), so
    // it is excluded -- otherwise a book of 14 chapters reads as 15 "chapters" and the last one is the toggle.
    this.ebookChapterItems = page.locator(
      '[data-qa-id^="player-ebook-chapter-"]:not([data-qa-id="player-ebook-chapter-drawer-toggle"])'
    );
    this.ebookSelectedChapter = this.ebookChapterItems.and(page.locator('.selected'));
    this.ebookChapterDrawerToggle = page.locator('[data-qa-id="player-ebook-chapter-drawer-toggle"]');
    this.ebookResourceDrawerToggle = page.locator('[data-qa-id="player-ebook-resource-drawer-toggle"]');
    this.ebookResourceCards = page.locator(
      '.resources_list_right [data-qa-id="playlist-resource-card"], .resources_list_right [data-qa-id="playlist-asset-card"], .resources_list_right [data-qa-id="playlist-quiz-card"]'
    );
    this.ebookScrollUpBtn = page.locator('[data-qa-id="player-ebook-resource-scroll-up"]');
    this.ebookScrollDownBtn = page.locator('[data-qa-id="player-ebook-resource-scroll-down"]');
    this.ebookNoResourcesMsg = page.getByText('No resources found!');

    // --- Checkpoints ---
    this.checkpointDialog = page.locator('.checkpoint-dashboard, mat-dialog-container, .checkpoint-dialog-panel');
    this.checkpointModeOnlineBtn = page.locator('[data-qa-id="player-checkpoint-mode-online"]');
    this.checkpointModeOfflineBtn = page.locator('[data-qa-id="player-checkpoint-mode-offline"]');
    this.checkpointStartBtn = page.locator('[data-qa-id="player-checkpoint-start-btn"]');
    this.checkpointResumeBtn = page.locator('[data-qa-id="player-checkpoint-resume-btn"]');
    this.checkpointEndBtn = page.locator('[data-qa-id="player-checkpoint-end-btn"]');
    this.checkpointLockTestBtn = page.locator('[data-qa-id="player-checkpoint-lock-test-btn"]');
    this.checkpointEndTestCloseBtn = page.locator('[data-qa-id="player-checkpoint-endtest-close-btn"]');
    this.checkpointConfirmPauseBtn = page.locator('[data-qa-id="player-checkpoint-confirm-pause-btn"]');
    this.checkpointTimerBadge = page.locator('[data-qa-id="player-checkpoint-timer-badge"]');
    this.checkpointTimerHideBtn = page.locator('[data-qa-id="player-checkpoint-timer-hide-btn"]');
    this.checkpointStudentRows = page.locator('[data-qa-id^="player-checkpoint-student-stu-"]');
    this.checkpointConceptTags = page.locator('[data-qa-id^="player-checkpoint-concept-tp-"]');
    this.checkpointGeneratePdfBtn = page.locator('[data-qa-id="player-checkpoint-generate-pdf-btn"]');
    this.checkpointCloseBtn = page.locator('[data-qa-id="player-checkpoint-close-btn"]');
    this.checkpointExcelExportBtn = page.getByText(/export.*excel|download.*excel|excel.*export/i);
    this.checkpointExcelUploadInput = page.locator('input[type="file"]');

    // Paper Test (offline checkpoint): the four-step workflow, the marks preview and the result message.
    this.checkpointPaperWorkflow = page.getByText('Paper Test Workflow', { exact: true });
    this.checkpointPaperTemplateBtn = page.getByRole('button', { name: /Download Excel Template/i });
    this.checkpointPaperChooseFile = page.getByText('Choose Excel File', { exact: true });
    this.checkpointPaperUploadInput = page.locator('input[type="file"]').last();
    this.checkpointPaperResultsBanner = page.getByRole('heading', { name: 'Paper Test', exact: true });
    this.checkpointMarksPreview = page.getByRole('heading', { name: 'Student Marks Register', exact: true });
    this.checkpointMarksPreviewSummary = page.getByText(/\d+ students\s*•\s*\d+ questions/);
    this.checkpointMarksInvalidNote = page.getByText(/cell\(s\) contain invalid values/);
    this.checkpointMarksCell = (row, col) => page.locator(`[data-qa-id="player-checkpoint-excel-cell-${row}-${col}"]`);
    this.checkpointMarksRows = page.locator('table tbody tr').filter({ has: page.locator('input') });
    this.checkpointMarksCancelBtn = page.getByRole('button', { name: 'Cancel', exact: true });
    this.checkpointMarksSubmitBtn = page.getByRole('button', { name: /Submit to Server/ });
    this.checkpointMessageText = page.getByRole('heading', { name: 'Message', exact: true }).locator('xpath=..');
    this.checkpointMessageOkBtn = page.getByRole('button', { name: 'OK', exact: true });
    this.checkpointAttemptedValue = page
      .getByText('ATTEMPTED', { exact: true })
      .locator('xpath=following-sibling::*[1]');
    this.checkpointAvgScore = page.getByText(/AVG\.?\s*SCORE:\s*\d+%/i);

    // --- Content players (Interactivity, Keywords, Concept Map, simulations, labs, lecture notes, 3D animations) ---
    // These all open the same shell: div.player-container > div.player holding one iframe that loads the packaged
    // HTML5 content from the file service.
    this.contentPlayer = page.locator('.player-container .player').filter({ visible: true });
    this.contentFrame = page.locator('.player-container .player iframe').filter({ visible: true });
    this.quizCompleteMsg = page.getByText('Quiz Complete!');
    // Flashcards play in the quiz shell: a card face, an arrow that flips/advances it, and the numbered pager.
    this.flashcardContainer = page.locator('.quiz-player-container').filter({ visible: true });
    this.flashcardNextArrow = page.locator('.quiz-player-container button').filter({ hasText: 'arrow_forward' });
  }

  /** Playlist card (any kind) whose visible text matches `title`. */
  cardByTitle(title) {
    return this.page
      .locator(
        '[data-qa-id="playlist-resource-card"], [data-qa-id="playlist-asset-card"], [data-qa-id="playlist-quiz-card"] .resource-card'
      )
      .filter({ hasText: title });
  }

  /** Load state of the visible content-player iframe: { loaded, nodes, text, size }. `loaded` is true once the
   * document inside has finished loading and has real content (elements or a canvas). */
  async contentFrameState() {
    const handle = await this.contentFrame.first().elementHandle({ timeout: 15000 });
    const frame = await handle.contentFrame();
    const box = await handle.boundingBox();
    const inner = await frame
      .evaluate(() => ({
        ready: document.readyState,
        nodes: document.body ? document.body.querySelectorAll('*').length : 0,
        text: document.body ? document.body.innerText.replace(/\s+/g, ' ').trim() : '',
      }))
      .catch(() => ({ ready: 'none', nodes: 0, text: '' }));
    return {
      loaded: inner.ready === 'complete' && inner.nodes > 5,
      nodes: inner.nodes,
      text: inner.text,
      size: box ? { width: box.width, height: box.height } : { width: 0, height: 0 },
    };
  }

  /** A picture of the visible content-player iframe, to tell whether an interaction changed what is shown. */
  async contentFrameShot() {
    return this.contentFrame.first().screenshot({ animations: 'disabled' });
  }

  /** Click (or drag, when `to` is given) inside the content-player iframe at fractions of its size (0..1). */
  async interactInContentFrame(from, to = null) {
    const box = await this.contentFrame.first().boundingBox();
    const at = ([fx, fy]) => [box.x + box.width * fx, box.y + box.height * fy];
    const [x1, y1] = at(from);
    if (!to) {
      await this.page.mouse.click(x1, y1);
      return;
    }
    const [x2, y2] = at(to);
    await this.page.mouse.move(x1, y1);
    await this.page.mouse.down();
    for (let i = 1; i <= 12; i++) await this.page.mouse.move(x1 + ((x2 - x1) * i) / 12, y1 + ((y2 - y1) * i) / 12);
    await this.page.mouse.up();
  }

  /** The first <video> found in any frame of the page (players nest it one or two iframes deep), or null. */
  async findVideoFrame() {
    for (const frame of this.page.frames()) {
      if (
        await frame
          .locator('video')
          .count()
          .catch(() => 0)
      )
        return frame;
    }
    return null;
  }

  /** Text on screen (the page and every same-origin frame) that looks like a template or data leak: "undefined",
   * "null", "NaN", "[object Object]" or an untranslated key such as "PLAYER.TITLE" / "{{title}}". */
  async leakedText() {
    const found = [];
    for (const frame of this.page.frames()) {
      const hits = await frame
        .evaluate(() => {
          const text = document.body ? document.body.innerText : '';
          const re =
            /(^|[\s:(])(undefined|null|NaN|\[object Object\]|\{\{[^}]*\}\}|[A-Z]{3,}(?:\.[A-Z_]{2,})+)(?=$|[\s.,)])/g;
          const out = [];
          let m;
          while ((m = re.exec(text)) && out.length < 5) out.push(text.slice(Math.max(0, m.index - 30), m.index + 40));
          return out;
        })
        .catch(() => []);
      found.push(...hits.map((h) => h.replace(/\s+/g, ' ').trim()));
    }
    return found;
  }

  /** A plain force-click on the close icon
   * intermittently does not register (confirmed via an isolated repro on a
   * Worksheet resource: elementFromPoint at the button's own center
   * correctly resolved to the button's own inner <svg>, ruling out a
   * click-through/overlay issue -- a genuine "first click after opening
   * doesn't always land" timing flake, the same class already documented
   * elsewhere in this app for Pen/Insert-Text/dock-toggle). Verify the
   * close actually took effect and retry with a plain (non-force) click,
   * which settles/waits for actionability on its own, if not. */
  async closePlayer() {
    for (let attempt = 0; attempt < 3; attempt++) {
      const stillOpenBefore = await this.closeIcon
        .first()
        .isVisible()
        .catch(() => false);
      if (!stillOpenBefore) return;
      await this.closeIcon
        .first()
        .click({ force: true, timeout: 5000 })
        .catch(() => {});
      const closed = await this.closeIcon
        .first()
        .waitFor({ state: 'hidden', timeout: 2500 })
        .then(() => true)
        .catch(() => false);
      if (closed) return;

      if (attempt < 2) {
        await this.closeIcon
          .first()
          .click({ timeout: 5000 })
          .catch(() => {});
      }
    }

    await this.closeIcon.first().waitFor({ state: 'hidden', timeout: 3000 });
  }

  /** What a closed player left on screen: visible close icons, visible player panels or frames, and whether the
   * whiteboard is what is under the middle of the screen again (no blank panel covering it). */
  async leftoversAfterClose() {
    await this.page.waitForTimeout(800);
    return {
      closeIcons: await this.closeIcon.count(),
      panels: await this.page
        .locator('.player-container .player, .player-container iframe, .player.image-player, .player.weblink-player')
        .filter({ visible: true })
        .count(),
      boardOnTop: await this.page.evaluate(() => {
        const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
        return !!(el && el.closest('[data-qa-id="wb-drawing-container"]'));
      }),
    };
  }

  /** On a heavily-populated Playlist strip (60+ resource
   * cards accumulated from other tests), a target card can sit a few px
   * below the viewport's bottom edge regardless of viewport size --
   * Playwright's own actionability-checked click then never lands, even
   * with force:true. A plain JS scrollIntoView + native DOM click bypasses
   * this reliably. */
  async openResourceCard(cardLocator) {
    await cardLocator.first().evaluate((el) => {
      el.scrollIntoView({ block: 'center' });
      el.click();
    });
  }

  /** DOM-level click after scrolling the element into view. At the client's real window size the
   * ebook's page-navigation bar (1 2 3 ... Go to Page) overlaps the bottom of its chapter list -- Chapter 14 is partly
   * covered -- so a coordinate click on the last chapters lands on the bar instead of the chapter. */
  async domClick(locator) {
    await locator.evaluate((el) => {
      el.scrollIntoView({ block: 'center' });
      el.click();
    });
  }

  /** Waits (up to `timeout`) for the player's close icon. Locator.isVisible() ignores its timeout
   * option and answers instantly, which read "not open" for every player slower than the click (PDF, video, ebook). */
  async isPlayerOpen(timeout = 15000) {
    return this.closeIcon
      .first()
      .waitFor({ state: 'visible', timeout })
      .then(() => true)
      .catch(() => false);
  }

  /** Clicking a resource card can silently fail to open the
   * player on the first attempt (same class of post-navigation timing
   * flakiness seen elsewhere in this app) -- verify the Monaco editor
   * actually mounted and retry the card click once if not. */
  async openCodeEditorCard(cardLocator) {
    await this.openResourceCard(cardLocator);
    const mounted = await this.monacoEditor
      .waitFor({ state: 'visible', timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    if (!mounted) {
      await this.openResourceCard(cardLocator);
      await this.monacoEditor.waitFor({ state: 'visible', timeout: 15000 });
    }
  }

  /** Types into the Monaco editor without clicking its textarea directly --
   * the textarea sits behind Monaco's own rendered
   * syntax-highlight spans, which intercept a plain Playwright click.
   * Clicking the wrapping .monaco-editor container instead reliably
   * focuses it. */
  async typeInCodeEditor(text) {
    await this.monacoEditor.click({ force: true });
    await this.page.keyboard.press('End');
    await this.page.keyboard.type(text, { delay: 10 });
  }

  /** Console-kind Code Editor output lives in a plain (non-iframe) split
   * pane -- read its text directly rather than searching the whole page,
   * which can miss text inside a scrolled/virtualized pane. */
  async codeOutputPaneText() {
    return this.codeEditorComponent.evaluate((host) => {
      const areas = Array.from(host.querySelectorAll('as-split-area'));
      const pane = areas.find((el) => !el.querySelector('.monaco-editor')) || areas[areas.length - 1];
      return pane ? pane.textContent.replace(/\s+/g, ' ').trim() : '';
    });
  }

  // ---------------------------------------------------------------------------------------------
  // Quiz flow helpers (added for Module 11).
  // ---------------------------------------------------------------------------------------------

  /** Open the first Quiz card in ATTEMPT mode and wait for the first question. The AIR card popup
   * that comes first counts down ~5s and then the attempt UI opens by itself; the camera-driven AIR card mode is out of scope
   * (owner, 10 Oct 2026). Returns { reachedQuestion, cameraBlocked } and never throws, so a
   * caller can assert on the outcome. */
  async startQuiz() {
    await this.quizCards.first().waitFor({ state: 'attached', timeout: 10000 });
    await this.openResourceCard(this.quizCards);
    const cameraBlocked = await this.page
      .getByText(/couldn't access your camera/i)
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (cameraBlocked) return { reachedQuestion: false, cameraBlocked: true };
    const reachedQuestion = await this.quizQuestion
      .waitFor({ state: 'visible', timeout: 30000 })
      .then(() => true)
      .catch(() => false);
    return { reachedQuestion, cameraBlocked: false };
  }

  /** Press the video's play/pause control. The control bar hides itself while the video plays, so the
   * button is not visible for a second click; a DOM-level click on it (its handler is managePlayPause) still works. */
  async toggleVideoPlayback() {
    await this.videoNavPlayBtn.evaluate((el) => el.click());
  }

  /** State of the playing video: { paused, currentTime, duration, readyState }, read from the <video> inside the player frame. */
  async videoState() {
    return this.videoElement.evaluate((v) => ({
      paused: v.paused,
      currentTime: v.currentTime,
      duration: v.duration,
      readyState: v.readyState,
    }));
  }

  /** Pick an option on the current question and submit it. */
  async answerCurrentQuestion(optionIndex = 0) {
    await this.quizOptions.nth(optionIndex).click({ force: true });
    await this.quizSubmitBtn.click({ force: true });
    await this.page.waitForTimeout(800);
  }

  /** 1-based number of the question currently showing, or null if it cannot be read. */
  async currentQuestionNumber() {
    const text = await this.quizCurrentQuestionNumber
      .first()
      .innerText()
      .catch(() => '');
    const n = parseInt(String(text).replace(/\D/g, ''), 10);
    return Number.isNaN(n) ? null : n;
  }
}

module.exports = { PlayerPage };
