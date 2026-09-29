// RES-04 — DropIt
// Source: CEPV2_Stories/09_Resources.md
// DropIt pairs a phone with the classroom screen via a QR code.
//
// RES-04-03..06 were originally fixme'd as needing a real second device to scan the code -- CONFIRMED LIVE
// (2026-09-23/24) that this is no longer true. The QR decodes (via jsQR, injected into the page -- see
// AddResourcePage.decodeDropitQrUrl()) to a real, public URL: https://tce-drop-it.web.app/cepweb-dropit/<token>.
// That page is what a phone's camera app would open after scanning, and it is a normal (if Flutter-rendered)
// web page a second Playwright browser context can open directly, exactly like this suite's existing
// two-session tests (see wb-06-annotation.spec.js's openSecondSession). No hardware needed.
//
// The companion page is Flutter Web (canvas-rendered, no real DOM for its visible UI), so pages/dropit-
// companion.page.js drives it by fixed coordinates within a fixed viewport, not locators -- see that file's own
// header for the full explanation. Every assertion here reads the CLASSROOM side's real DOM status instead of
// trying to read anything back from the phone page.

const { chromium } = require('@playwright/test');
const { test, expect } = require('../../fixtures');
const { DropitCompanionPage } = require('../../pages/dropit-companion.page');
const { PNG_FILE } = require('../../pages/add-resource.page');
const fs = require('fs');
const path = require('path');
const os = require('os');

test.describe('RES-04 DropIt', () => {
  test.use({ classMap: 'default' });

  const openDropIt = async (user) => {
    await user.addResource.openAction('dropit');
    await expect(user.addResource.dropitQrCanvas).toBeVisible({ timeout: 15000 });
  };

  /** Opens DropIt, decodes its QR, and "scans" it from a genuinely separate browser context (own process, own
   * storage -- the same isolation a real second device would have). Resolves once the classroom side's own
   * status locator confirms pairing, so every caller starts from a proven-connected state. Returns
   * { browser, phone } -- the caller must `await browser.close()` when done. */
  const pairDropit = async (user) => {
    await openDropIt(user);
    const url = await user.addResource.decodeDropitQrUrl();
    expect(url, 'the QR decodes to a real pairing URL').toBeTruthy();

    // DROPIT_HEADED=1 opens the simulated phone as a real, visible, slowed-down browser window instead of
    // running it headless -- for watching the pairing/share/upload flow live, not part of normal CI runs.
    const browser = await chromium.launch({
      headless: !process.env.DROPIT_HEADED,
      slowMo: process.env.DROPIT_HEADED ? 400 : 0,
    });
    const context = await browser.newContext({ viewport: DropitCompanionPage.viewport });
    const phone = new DropitCompanionPage(await context.newPage());
    await phone.open(url);

    await expect(user.addResource.dropitConnectionStatus, 'the classroom side confirms pairing').toHaveText(
      /connected/i,
      { timeout: 15000 }
    );
    return { browser, phone };
  };

  test('RES-04-01: opening DropIt displays a QR code', { tag: ['@smoke', '@functional'] }, async ({ user }) => {
    await openDropIt(user);
    const box = await user.addResource.dropitQrCanvas.boundingBox();
    expect(box.width, 'a real, scannable-size code').toBeGreaterThan(80);
    expect(box.height).toBeGreaterThan(80);
  });

  test(
    'RES-04-02: the default pairing status is shown correctly before the QR code is scanned',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openDropIt(user);
      const status = user.addResource.dropitConnectionStatus;
      await expect(status).toBeVisible();
      const text = ((await status.innerText()) || '').replace(/\s+/g, ' ').trim();
      test.info().annotations.push({ type: 'note', description: `Default pairing status: "${text}"` });

      expect(text.length).toBeGreaterThan(0);
      expect(text, 'reads as not-yet-paired').toMatch(/waiting|not connected|disconnected|scan|connect/i);
      expect(text, 'and not as already paired').not.toMatch(/^connected$|paired successfully/i);
    }
  );

  test(
    'RES-04-03: scanning the QR code successfully pairs the device',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const { browser } = await pairDropit(user);
      // pairDropit()'s own assertion IS the pairing check (dropitConnectionStatus reads "Connected") -- this
      // test exists as its own case per the story, so the assertion is restated explicitly here too.
      await expect(user.addResource.dropitConnectionStatus).toHaveText(/connected/i);
      await browser.close();
    }
  );

  test(
    // Whether sharing creates the Playlist resource at all is RES-04-06 (link) / RES-04-13 (file); this case is that the
    // shared resource OPENS correctly (split 2026-09-28).
    'RES-04-04: a link shared from a paired device opens correctly from the Playlist',
    { tag: ['@functional'] },
    async ({ user }) => {
      // 150 s: pairing, sharing, opening the player and removing the card again took just over 60 s live (2026-09-26).
      test.setTimeout(150000);
      const { browser, phone } = await pairDropit(user);
      const sharedUrl = 'https://example.com/';
      try {
        const before = await user.playlist.resourceCards.count();
        await phone.shareLink(sharedUrl);

        // The classroom side closes DropIt and the new card appears in the Playlist -- not just a "success"
        // indicator on the phone (that phone-side text is unreadable anyway; see the file header).
        await user.addResource.dropitCloseBtn.click({ force: true, timeout: 5000 }).catch(() => {});
        await user.playlist.ensureDrawerVisible();
        await expect(user.playlist.resourceCards, 'set-up: a new card was added for the shared link').toHaveCount(
          before + 1,
          { timeout: 15000 }
        );

        const added = user.playlist.resourceCards.last();
        const title = ((await added.innerText()) || '').trim();
        test.info().annotations.push({ type: 'note', description: `Shared-link card title: "${title}"` });

        // "Opens correctly when accessed": open it and confirm a real weblink player renders, not an error.
        await user.player.openResourceCard(added);
        expect(await user.player.isPlayerOpen(), 'the shared link opened').toBe(true);
        await expect(user.player.weblinkWrapper, 'a weblink player rendered').toBeVisible({ timeout: 15000 });
        const box = await user.player.weblinkWrapper.boundingBox();
        expect(box.width, 'it renders at a real size, not collapsed').toBeGreaterThan(150);
        expect(box.height).toBeGreaterThan(150);

        await user.player.closePlayer();
        await user.playlist.ensureDrawerVisible();
        await user.playlist.removeOwnedAsset(added);
      } finally {
        await browser.close();
      }
    }
  );

  test('RES-04-05: a file shared from a paired device opens correctly', { tag: ['@functional'] }, async ({ user }) => {
    test.setTimeout(60000);
    const { browser, phone } = await pairDropit(user);
    // CONFIRMED LIVE: DropIt only accepts png|jpg|jpeg|gif|bmp|pdf|doc|docx -- a .txt is rejected outright,
    // no upload attempted, so this deliberately reuses the suite's existing valid PNG fixture.
    const tmpFile = path.join(os.tmpdir(), PNG_FILE.name);
    fs.writeFileSync(tmpFile, PNG_FILE.buffer);
    try {
      const before = await user.playlist.resourceCards.count();
      await phone.uploadFile(tmpFile);

      // CONFIRMED LIVE: a successful upload auto-closes DropIt and auto-opens the image player on the
      // classroom side (more automatic than the link-share case, which only adds a Playlist card).
      expect(await user.player.isPlayerOpen(), 'the uploaded file auto-opened').toBe(true);
      const rendered = user.player.imageWrapper.or(user.player.imageGalleryImg).first();
      await expect(rendered, 'an image player rendered').toBeVisible({ timeout: 15000 });
      const box = await rendered.boundingBox();
      expect(box.width, 'it renders at a real size, not collapsed').toBeGreaterThan(50);
      expect(box.height).toBeGreaterThan(50);

      await user.player.closePlayer();
      await user.playlist.ensureDrawerVisible();
      // (Whether the card was genuinely created is RES-04-13; waited for here only so the right card is removed.)
      await expect(user.playlist.resourceCards, 'the new card for the uploaded file').toHaveCount(before + 1, {
        timeout: 15000,
      });
      // Closing a player leaves the drawer lowered until re-expanded (see PlaylistPage's own notes); the wait
      // above is long enough for it to have re-collapsed, so re-confirm right before the hover-sensitive
      // removal rather than trusting the earlier call to still hold.
      await user.playlist.ensureDrawerVisible();
      await user.playlist.removeOwnedAsset(user.playlist.resourceCards.last());
    } finally {
      fs.unlinkSync(tmpFile);
      await browser.close();
    }
  });

  // DropIt's "success shown but resource missing" failure mode: the Playlist's own COUNT genuinely increases, not just a
  // "success"/"Resource Created" indicator appearing somewhere -- for a shared link (RES-04-06) and for a shared file
  // (RES-04-13), one test each (split 2026-09-28). RES-04-04/05 check the resources also OPEN correctly.
  test(
    'RES-04-06: sharing a link through DropIt genuinely creates a Playlist resource ("success shown but resource missing" does not recur)',
    { tag: ['@regression'] },
    async ({ user }) => {
      test.setTimeout(90000);
      const { browser: linkBrowser, phone: linkPhone } = await pairDropit(user);
      const beforeLink = await user.playlist.resourceCards.count();
      try {
        await linkPhone.shareLink('https://example.org/');
        await user.addResource.dropitCloseBtn.click({ force: true, timeout: 5000 }).catch(() => {});
        await user.playlist.ensureDrawerVisible();
        await expect(
          user.playlist.resourceCards,
          'the shared link genuinely created a Playlist resource, not just a success message'
        ).toHaveCount(beforeLink + 1, { timeout: 15000 });
        await user.playlist.ensureDrawerVisible(); // re-confirm: the wait above is long enough to have re-collapsed it
        await user.playlist.removeOwnedAsset(user.playlist.resourceCards.last());
      } finally {
        await linkBrowser.close();
      }
    }
  );

  test(
    'RES-04-13: sharing a file through DropIt genuinely creates a Playlist resource ("success shown but resource missing" does not recur)',
    { tag: ['@regression'] },
    async ({ user }) => {
      test.setTimeout(90000);
      const { browser: fileBrowser, phone: filePhone } = await pairDropit(user);
      const tmpFile = path.join(os.tmpdir(), PNG_FILE.name);
      fs.writeFileSync(tmpFile, PNG_FILE.buffer);
      const beforeFile = await user.playlist.resourceCards.count();
      try {
        await filePhone.uploadFile(tmpFile);
        await user.player.closePlayer().catch(() => {});
        await user.playlist.ensureDrawerVisible();
        await expect(
          user.playlist.resourceCards,
          'the uploaded file genuinely created a Playlist resource, not just a success message'
        ).toHaveCount(beforeFile + 1, { timeout: 15000 });
        await user.playlist.ensureDrawerVisible(); // re-confirm: the wait above is long enough to have re-collapsed it
        await user.playlist.removeOwnedAsset(user.playlist.resourceCards.last());
      } finally {
        fs.unlinkSync(tmpFile);
        await fileBrowser.close();
      }
    }
  );

  // --- Added 2026-09-26 (gap-fill from the reference suite's Drop It workbook and Zoho bugs) ---

  test('RES-04-07: Close exits DropIt cleanly', { tag: ['@functional'] }, async ({ user }) => {
    await openDropIt(user);
    await user.addResource.dropitCloseBtn.click();
    await expect(user.addResource.dropitQrCanvas).toBeHidden({ timeout: 10000 });
    await expect(user.addResource.dropitCloseBtn).toBeHidden();
  });

  // Opening and closing DropIt 8 times: no stuck panel (RES-04-08), no duplicated panel (RES-04-14) -- one test each
  // (split 2026-09-28).
  test(
    'RES-04-08: opening and closing DropIt 8 times, every Close really closes it (no stuck panel)',
    { tag: ['@edge'] },
    async ({ user }) => {
      test.setTimeout(180000);
      for (let i = 0; i < 8; i++) {
        await openDropIt(user);
        await user.addResource.dropitCloseBtn.click();
        await expect(user.addResource.dropitQrCanvas, `closed after open/close ${i + 1}`).toBeHidden({
          timeout: 10000,
        });
      }
    }
  );

  test(
    'RES-04-14: after opening and closing DropIt 8 times, opening it again shows exactly one panel',
    { tag: ['@edge'] },
    async ({ user }) => {
      test.setTimeout(180000);
      for (let i = 0; i < 8; i++) {
        await openDropIt(user);
        await user.addResource.dropitCloseBtn.click();
        await user.addResource.dropitQrCanvas.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
      }
      await openDropIt(user);
      try {
        await expect(user.addResource.dropitQrCanvas, 'one QR, not several').toHaveCount(1);
      } finally {
        await user.addResource.dropitCloseBtn.first().click();
      }
    }
  );

  test(
    'RES-04-09: switching class straight after opening DropIt leaves no DropIt panel behind (regression)',
    { tag: ['@bug', '@regression'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232; the reference suite's DRP-BREAK-01): switching class
      // straight after opening DropIt leaves its panel and QR code on screen over the new class.
      test.fail(true, 'DropIt stays open over the new class after a class switch');
      await openDropIt(user);
      await user.nav.applyClassMap('navigationGeneral');
      await expect(user.whiteboard.currentClassBtn).toContainText('Class 5');
      await expect(user.addResource.dropitQrCanvas, 'no DropIt panel over the new class').toBeHidden({
        timeout: 10000,
      });
    }
  );

  test(
    "RES-04-10: DropIt's Close button doesn't cover the Add Resource button (regression)",
    { tag: ['@bug', '@regression'] },
    async ({ user, page }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232; the reference suite's DRP-FAB-OVERLAP-01): DropIt's
      // Close button sits over the Add Resource "+" button.
      test.fail(true, "DropIt's Close button covers the Add Resource button");
      await openDropIt(user);
      const close = await user.addResource.dropitCloseBtn.boundingBox();
      const add = await user.addResource.addResourcesTrigger.boundingBox();
      const overlap =
        close &&
        add &&
        close.x < add.x + add.width &&
        add.x < close.x + close.width &&
        close.y < add.y + add.height &&
        add.y < close.y + close.height;
      expect(overlap, 'Close does not sit on top of Add Resource').toBeFalsy();
      // And the Add Resource button is the thing actually under its own centre.
      const onTop = await page.evaluate(
        ({ x, y }) => !!document.elementFromPoint(x, y)?.closest('[data-qa-id="add-resource-trigger"]'),
        { x: add.x + add.width / 2, y: add.y + add.height / 2 }
      );
      expect(onTop, 'Add Resource is not covered').toBe(true);
      await user.addResource.dropitCloseBtn.click();
    }
  );

  test(
    'RES-04-11: sharing text from the paired device works (regression, Zoho TCN-I16701)',
    { tag: ['@bug', '@regression'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232; Zoho TCN-I16701, still open): text shared from the paired
      // device (the companion page offers only Upload File and Share Link) never arrives in the classroom Playlist.
      test.fail(true, 'Text shared through DropIt does not arrive in the Playlist');
      test.setTimeout(90000);
      const { browser, phone } = await pairDropit(user);
      try {
        const before = await user.playlist.resourceCards.count();
        const note = `Homework reminder ${Date.now()}`;
        await phone.shareLink(note);
        await expect(
          user.addResource.dropitTransferStatus.or(user.addResource.dropitUploadStatus).first(),
          'not a failure'
        ).not.toHaveText(/fail/i, { timeout: 10000 });
        await user.addResource.dropitCloseBtn.click({ force: true }).catch(() => {});
        await user.playlist.ensureDrawerVisible();
        await expect(user.playlist.resourceCards, 'the shared text arrived as a card').toHaveCount(before + 1, {
          timeout: 20000,
        });
        await user.playlist.removeOwnedAsset(user.playlist.resourceCards.last()).catch(() => {});
      } finally {
        await browser.close();
      }
    }
  );

  test(
    'RES-04-12: a file type DropIt does not support is rejected with a clear message',
    { tag: ['@negative'] },
    async ({ user }) => {
      test.setTimeout(90000);
      const { browser, phone } = await pairDropit(user);
      const tmp = path.join(os.tmpdir(), 'autotest-notes.txt');
      fs.writeFileSync(tmp, 'plain text is not an accepted type');
      try {
        const before = await user.playlist.resourceCards.count();
        await phone.uploadFile(tmp);
        await user.page.waitForTimeout(5000);
        await expect(user.addResource.dropitUploadStatus, 'no successful upload recorded').not.toHaveText(
          /success|complete|uploaded/i
        );
        await expect(user.playlist.resourceCards, 'nothing added').toHaveCount(before);
        const shot = await phone.page.screenshot();
        await test.info().attach('phone after rejected upload', { body: shot, contentType: 'image/png' });
      } finally {
        fs.unlinkSync(tmp);
        await browser.close();
      }
    }
  );
});
