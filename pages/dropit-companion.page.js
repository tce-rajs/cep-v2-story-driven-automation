// Page Object for the DropIt "phone" companion page (https://tce-drop-it.web.app/cepweb-dropit/<token>) -- the
// page a real phone's camera app opens after scanning the classroom's DropIt QR code.
//
// CONFIRMED LIVE (2026-09-23/24): this is a Flutter Web app, rendered to a <canvas> -- document.body has no real
// DOM for its visible UI (only a hidden flt-semantics-placeholder), so its buttons are addressed by fixed pixel
// coordinates within a FIXED phone-sized viewport (420x800), not locators. Reading status text back from this
// page is therefore NOT reliable (document.body.innerText is empty despite real visible text) -- every test
// using this page object asserts pairing/transfer outcomes through the CLASSROOM side's own real DOM locators
// (AddResourcePage's dropitConnectionStatus/dropitTransferStatus/dropitUploadStatus) instead, never through this
// page's own content.
//
// One thing IS backed by a real, positioned element: text input. Typing via page.keyboard.type() after clicking
// the visible field works normally.
//
// Accepted upload file types, confirmed live via the app's own validation message: png, jpg, jpeg, gif, bmp,
// pdf, doc, docx -- NOT arbitrary files (a .txt was rejected outright, no upload attempted).

const VIEWPORT = { width: 420, height: 800 };

// Coordinates confirmed live at the VIEWPORT size above. The landing screen shows "Upload File" and "Share
// Link" side by side; clicking "Share Link" replaces them with a text field and Cancel/Share buttons.
const COORDS = {
  uploadFileBtn: { x: 133, y: 629 },
  shareLinkBtn: { x: 320, y: 629 },
  shareLinkField: { x: 210, y: 596 },
  shareConfirmBtn: { x: 258, y: 678 },
};

class DropitCompanionPage {
  constructor(page) {
    this.page = page;
  }

  static get viewport() {
    return VIEWPORT;
  }

  /** Navigates to the pairing URL decoded from the classroom's QR code -- the equivalent of a phone's camera
   * app opening the scanned link. Resolves once the page has settled enough for pairing to register on the
   * classroom side (confirmed via the classroom's own status locator by the caller, not this page). */
  async open(url) {
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await this.page.waitForTimeout(3000);
  }

  /** Shares a URL: opens the Share Link form, types the URL, confirms. CONFIRMED LIVE: after clicking Share the
   * page shows "Resource Creation Status: Creating Resource" for a few seconds before the classroom side's
   * Playlist actually gains the new card -- a short fixed wait here is deliberate, not arbitrary padding,
   * because that status text is unreadable from this page (see the file header) so there is nothing to poll. */
  async shareLink(url) {
    await this.page.mouse.click(COORDS.shareLinkBtn.x, COORDS.shareLinkBtn.y);
    await this.page.waitForTimeout(1000);
    await this.page.mouse.click(COORDS.shareLinkField.x, COORDS.shareLinkField.y);
    await this.page.waitForTimeout(300);
    await this.page.keyboard.type(url, { delay: 15 });
    await this.page.waitForTimeout(300);
    await this.page.mouse.click(COORDS.shareConfirmBtn.x, COORDS.shareConfirmBtn.y);
    await this.page.waitForTimeout(5000);
  }

  /** Uploads a file: clicks "Upload File", which triggers a real native file-chooser (CONFIRMED LIVE: Flutter's
   * upload button is backed by a genuine <input type="file">, so Playwright's filechooser event fires
   * normally). `file` is a local path. */
  async uploadFile(filePath) {
    const [chooser] = await Promise.all([
      this.page.waitForEvent('filechooser', { timeout: 8000 }),
      this.page.mouse.click(COORDS.uploadFileBtn.x, COORDS.uploadFileBtn.y),
    ]);
    await chooser.setFiles(filePath);
    await this.page.waitForTimeout(1500);
  }
}

module.exports = { DropitCompanionPage };
