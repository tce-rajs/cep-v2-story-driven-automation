// RSL-09 — Large and bad input does not take the app down
// Source: CEPV2_Stories/18_Resilience.md
// Uploads use the test-data files (test-data/, scripts/make-test-data.js) copied under a unique name, and every
// resource a test makes is removed again. The phone for DropIt is a separate phone-sized browser opening the link in
// the DropIt QR code (pages/dropit-companion.page.js). Nothing is sent to students: the notice and homework of
// RSL-09-06 are discarded.
// RSL-09-02 (a 2 GB video through DropIt) is not automated: it would push 2 GB to the shared school server.
// RSL-09-05 needs a topic with 100 resources: set RSL_100_RESOURCES_TOPIC="Class 9|A|Science|<chapter index>|<topic
// index>" when the server has one.

const { chromium } = require('@playwright/test');
const { test, expect } = require('../../fixtures');
const { DropitCompanionPage } = require('../../pages/dropit-companion.page');
const { uniqueCopy } = require('../00-flows/flow-helpers');

const stemOf = (file) =>
  require('path')
    .basename(file)
    .replace(/\.[^.]+$/, '');
const failureMessage = /fail|error|unable|could ?n.?t|try again|network|interrupt|lost|disconnect/i;

test.describe('RSL-09 Large and bad input does not take the app down', () => {
  test.describe.configure({ timeout: 300000 });

  test.describe('uploads', () => {
    test.use({ classMap: 'default' });

    test(
      'RSL-09-03: the network drops half-way through a 10 MB upload in Create; a clear message, no half-uploaded resource in the Playlist',
      { tag: ['@interruption'] },
      async ({ user, page }) => {
        const ar = user.addResource;
        const title = `AutoTest-dropped-upload-${Date.now()}`;
        // The upload (a POST with a body over 1 MB) is cut 3 s in, as a Wi-Fi drop would.
        let cut = 0;
        const dropUpload = async (route) => {
          const r = route.request();
          if (r.method() === 'POST' && (r.postDataBuffer() || Buffer.alloc(0)).length > 1e6) {
            cut++;
            await new Promise((resolve) => setTimeout(resolve, 3000));
            return route.abort('internetdisconnected');
          }
          return route.continue();
        };
        await page.route('**/*', dropUpload);
        try {
          await ar.openAction('create');
          await ar.createForm.waitFor({ state: 'visible', timeout: 10000 });
          await ar.titleInput.fill(title);
          await ar.fileInput.setInputFiles(uniqueCopy('positive/near-limit-9.6MB.mp4'));
          await ar.submitBtn.click();
          await expect
            .poll(() => cut, { message: 'set-up: the upload started and was cut', timeout: 60000 })
            .toBeGreaterThan(0);
          await expect(page.getByText(failureMessage).first(), 'a clear message that the upload failed').toBeVisible({
            timeout: 30000,
          });
        } finally {
          await page.unroute('**/*', dropUpload);
        }
        await page.keyboard.press('Escape');
        await page.reload();
        await user.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
        await user.playlist.ensureDrawerVisible();
        const card = user.playlist.resourceCards.filter({ hasText: title });
        try {
          await expect(card, 'no half-uploaded resource in the Playlist').toHaveCount(0, { timeout: 10000 });
        } finally {
          if (await card.count()) await user.playlist.removeOwnedAsset(card.first()).catch(() => {});
        }
      }
    );

    test(
      'RSL-09-04: the phone loses Wi-Fi half-way through a DropIt send; the teacher is told, and no broken resource appears',
      { tag: ['@interruption'] },
      async ({ user, page }) => {
        const file = uniqueCopy('positive/near-limit-9.6MB.mp4');
        const stem = stemOf(file);
        await user.addResource.openAction('dropit');
        await expect(user.addResource.dropitQrCanvas, 'set-up: the DropIt QR code').toBeVisible({ timeout: 15000 });
        const url = await user.addResource.decodeDropitQrUrl();
        const browser = await chromium.launch();
        try {
          const context = await browser.newContext({ viewport: DropitCompanionPage.viewport });
          const phone = new DropitCompanionPage(await context.newPage());
          await phone.open(url);
          await expect(user.addResource.dropitConnectionStatus, 'set-up: the phone is connected').toHaveText(
            /connected/i,
            { timeout: 15000 }
          );
          const before = await user.playlist.resourceCards.count();
          await phone.uploadFile(file);
          // Half-way: the phone's network goes, then the phone itself (out of range).
          await context.setOffline(true);
          await browser.close();
          const status = user.addResource.dropitConnectionStatus
            .or(user.addResource.dropitTransferStatus)
            .or(user.addResource.dropitUploadStatus)
            .filter({ hasText: failureMessage })
            .or(page.getByText(failureMessage).filter({ visible: true }))
            .first();
          await expect(status, 'the teacher is told the send did not finish').toBeVisible({ timeout: 30000 });
          await user.addResource.dropitCloseBtn.click({ force: true, timeout: 3000 }).catch(() => {});
          await user.player.closePlayer().catch(() => {});
          await user.playlist.ensureDrawerVisible();
          await page.waitForTimeout(5000);
          const named = user.playlist.resourceCards.filter({ hasText: stem });
          expect(
            { named: await named.count(), added: (await user.playlist.resourceCards.count()) - before },
            'no broken resource appeared'
          ).toEqual({ named: 0, added: 0 });
        } finally {
          await browser.close().catch(() => {});
          await user.addResource.dropitCloseBtn.click({ force: true, timeout: 2000 }).catch(() => {});
          const named = user.playlist.resourceCards.filter({ hasText: stem });
          if (await named.count().catch(() => 0)) await user.playlist.removeOwnedAsset(named.first()).catch(() => {});
        }
      }
    );
  });

  test(
    'RSL-09-05: a topic with 100 resources keeps the Playlist strip and Library usable',
    { tag: ['@edge'] },
    async ({ user }) => {
      const spec = process.env.RSL_100_RESOURCES_TOPIC;
      if (!spec)
        throw new Error(
          'DATA MISSING ON THIS SERVER: no topic with 100 resources is known (set RSL_100_RESOURCES_TOPIC="Class|Division|Subject|chapter|topic")'
        );
      const [grade, division, subject, chapter, topic] = spec.split('|');
      await user.nav.resetToClass(grade, division, subject);
      await user.nav.goToChapterTopic(Number(chapter), Number(topic));
      await user.playlist.ensureDrawerVisible();
      await expect
        .poll(() => user.playlist.resourceCards.count(), { message: 'set-up: 100 resources', timeout: 30000 })
        .toBeGreaterThanOrEqual(100);
      // The strip scrolls to its last card and that card opens.
      const t0 = Date.now();
      for (let i = 0; i < 40 && (await user.playlist.rightScrollBtn.isEnabled().catch(() => false)); i++)
        await user.playlist.rightScrollBtn.click({ force: true });
      await user.player.openResourceCard(user.playlist.resourceCards.last());
      expect(await user.player.isPlayerOpen(20000), 'the last card opens').toBe(true);
      await user.player.closePlayer();
      const stripMs = Date.now() - t0;
      // The Library opens and searches.
      await user.addResource.openAction('library');
      await expect(user.addResource.libraryPopup, 'the Library opens').toBeVisible({ timeout: 15000 });
      await user.addResource.librarySearchInput.fill('science');
      await user.addResource.librarySearchBtn.click({ force: true });
      await expect(user.addResource.libraryResults.first(), 'and finds results').toBeVisible({ timeout: 30000 });
      await user.addResource.libraryCloseBtn.click({ force: true }).catch(() => {});
      test
        .info()
        .annotations.push({ type: 'note', description: `Scrolling to and opening the last card: ${stripMs} ms.` });
      expect(stripMs, 'the strip stays quick').toBeLessThan(30000);
    }
  );

  test.describe('very long text', () => {
    test.use({ classMap: 'aiHomework', freshSpace: true });

    test(
      'RSL-09-06: 10,000 characters pasted into a text box, a notice body and a homework title are handled without a crash',
      { tag: ['@edge'] },
      async ({ user, page }) => {
        test.setTimeout(480000);
        const LONG = 'Long pasted text 0123456789. '.repeat(345).slice(0, 10000);
        const crashes = [];
        page.on('crash', () => crashes.push('crash'));
        const fits = async (locator, name) => {
          const box = await locator.boundingBox();
          const vp = await user.header.viewportSize();
          expect.soft(box && box.x >= -1 && box.x + box.width <= vp.width + 1, `${name} stays on screen`).toBe(true);
        };

        // 1. A whiteboard text box (removed again afterwards).
        const textBox = await user.whiteboard.insertTextAt(400, 300);
        await textBox
          .locator('.text-input-container[contenteditable="true"]')
          .click({ timeout: 5000 })
          .catch(() => {});
        await page.keyboard.insertText(LONG);
        await page.keyboard.press('Escape');
        expect
          .soft((await textBox.innerText()).replace(/\s+/g, ' ').length, 'text box: all 10,000 characters')
          .toBeGreaterThanOrEqual(9900);
        await fits(user.toolbar.container, 'text box: the toolbar');
        await user.toolbar.selectTool('gtSelect');
        await textBox.click({ force: true }).catch(() => {});
        await user.toolbar.textMenuDeleteBtn.click({ force: true, timeout: 5000 }).catch(() => {});

        // 2. A notice body (the composer is closed without sending).
        const notices = user.aiNotices;
        try {
          await notices.openComposer(user, 'Science fair tomorrow');
          await notices.bodyEditor.click();
          await page.keyboard.press('Control+A');
          await page.keyboard.insertText(LONG);
          expect
            .soft((await notices.bodyEditor.innerText()).length, 'notice body: all 10,000 characters')
            .toBeGreaterThanOrEqual(9900);
          await notices.hideKeyboard();
          await fits(notices.sendBtn, 'notice: Send');
        } finally {
          await notices.closeAll();
        }

        // 3. A homework title (discarded, never assigned).
        const hw = user.aiHomework;
        try {
          await hw.open(user.magnet);
          await hw.setHomeworkCount(5);
          await hw.generate();
          await hw.goToAssign();
          await hw.assignTitleInput.fill(LONG);
          const kept = (await hw.assignTitleInput.inputValue()).length;
          test
            .info()
            .annotations.push({ type: 'note', description: `Homework title kept ${kept} of 10,000 characters.` });
          await hw.hideKeyboard();
          await fits(hw.assignSendBtn, 'homework: Ready to Send');
        } finally {
          await hw.closeAll();
        }
        expect(crashes, 'no crash').toEqual([]);
        await expect(user.toolbar.wbSvg, 'the app is still working').toBeVisible();
      }
    );
  });
});
