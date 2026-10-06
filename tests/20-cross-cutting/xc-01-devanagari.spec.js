// XC-01 — Hindi and Marathi (Devanagari) everywhere
// Source: CEPV2_Stories/20_CrossCutting.md
// Runs in the desktop client (fixtures default). Writing and typing happen on the `devanagari` class-map board
// (Class 7A Hindi Language), below anything already there; nothing is erased, nothing is sent.
// The handwriting strokes are measured from the Kalam font (real Indian handwriting) in a separate plain browser page
// that is only a drawing surface -- the app itself is driven only in the client.

const { chromium } = require('@playwright/test');
const { test, expect } = require('../../fixtures');
const { textToStrokes } = require('../../pages/lib/font-strokes');

const MARATHI = 'शाळेत आज विज्ञानाचा तास आहे';
const HINDI = 'कक्षा सात की सूचना: कल विज्ञान प्रदर्शनी है';
const MARATHI_TITLE = 'गृहपाठ: पाण्याचे चक्र';
const HINDI_RESOURCE = `हिंदी संसाधन ${Date.now() % 100000}`;

test.describe('XC-01 Hindi and Marathi everywhere', () => {
  test.use({ classMap: 'devanagari', freshSpace: true });

  test(
    'XC-01-01: Marathi typed in a whiteboard text box is shown correctly and is unchanged after a reload',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const area = await user.content.writingArea();
      const box = await user.whiteboard.wbSvg.boundingBox();
      const textObj = await user.whiteboard.insertTextAndType(area.x - box.x + 40, area.y - box.y + 60, MARATHI);
      await page.keyboard.press('Escape');
      await expect(textObj, 'shown as typed (joined letters and matras intact)').toContainText(MARATHI);
      await user.content.waitForSaved().catch(() => {});
      await page.reload();
      await user.toolbar.wbSvg.waitFor({ state: 'visible', timeout: 60000 });
      await expect(
        user.whiteboard.textObjects.filter({ hasText: MARATHI }),
        'the same Marathi text is back after a reload, exactly once'
      ).toHaveCount(1, { timeout: 30000 });
    }
  );

  test(
    'XC-01-08: Marathi handwriting is saved exactly: every stroke comes back after a reload',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      // Measure the handwriting in a separate plain browser page (never the app window).
      const browser = await chromium.launch();
      let strokes;
      try {
        const drawing = await (await browser.newContext()).newPage();
        const area = await user.content.writingArea();
        const scale = 0.6;
        const res = await textToStrokes(drawing, MARATHI, { fontSize: 90, maxWidth: area.width / scale });
        strokes = res.strokes.map((s) => s.map((p) => ({ x: area.x + p.x * scale, y: area.y + 20 + p.y * scale })));
      } finally {
        await browser.close();
      }
      const before = await user.toolbar.allPaths.count();
      await user.content.writeHandwriting([{ words: [{ text: MARATHI, strokes }] }], { step: 3 });
      await page.waitForTimeout(1500);
      const written = await user.toolbar.allPaths.evaluateAll(
        (els, from) => els.slice(from).map((e) => e.getAttribute('d')),
        before
      );
      expect(written.length, 'the handwriting landed as strokes').toBeGreaterThan(10);

      await user.content.waitForSaved().catch(() => {});
      await page.waitForTimeout(12000); // past the autosave countdown (WB-09-09)
      await page.reload();
      await user.toolbar.wbSvg.waitFor({ state: 'visible', timeout: 60000 });
      await page.waitForTimeout(5000);
      const onBoard = new Set(await user.toolbar.allPaths.evaluateAll((els) => els.map((e) => e.getAttribute('d'))));
      const missing = written.filter((d) => !onBoard.has(d));
      expect(missing, `every Marathi stroke is back (${written.length} written)`).toHaveLength(0);
    }
  );

  test(
    'XC-01-02: a Hindi notice title and body are accepted and shown correctly in the notice composer',
    { tag: ['@functional'] },
    async ({ user }) => {
      await user.nav.applyClassMap('aiNotices'); // a class whose Magnet offers Notice
      test.info().annotations.push({
        type: 'note',
        description: 'Typed and read back in the composer; not sent (sending is AIN-03, which uses English text).',
      });
      const notices = user.aiNotices;
      await notices.openComposer(user, 'Photosynthesis is important');
      await notices.titleInput.fill(HINDI);
      await expect(notices.titleInput, 'Hindi title kept as typed').toHaveValue(HINDI);
      await notices.bodyEditor.click();
      await user.page.keyboard.type(HINDI);
      await expect(notices.bodyEditor, 'Hindi body shown as typed').toContainText(HINDI);
      await notices.close();
    }
  );

  test(
    'XC-01-03: a Marathi homework title is accepted and shown correctly in the assignment form',
    { tag: ['@functional'] },
    async ({ user }) => {
      const hw = user.aiHomework;
      await user.nav.applyClassMap('aiHomework');
      await hw.open(user.magnet);
      await hw.generate();
      await hw.goToAssign();
      await hw.assignTitleInput.fill(MARATHI_TITLE);
      await expect(hw.assignTitleInput, 'Marathi title kept as typed').toHaveValue(MARATHI_TITLE);
      test.info().annotations.push({ type: 'note', description: 'Not sent: the builder is closed without assigning.' });
      await hw.closeAll();
    }
  );

  test(
    'XC-01-04: a Hindi resource title in Create is saved and shown on the Playlist card',
    { tag: ['@functional'] },
    async ({ user }) => {
      await user.addResource.createAsset(HINDI_RESOURCE);
      const card = user.playlist.resourceCards.filter({ hasText: HINDI_RESOURCE });
      try {
        await expect(card, 'the card shows the Hindi title').toHaveCount(1, { timeout: 30000 });
      } finally {
        if (await card.count()) await user.playlist.removeOwnedAsset(card.first());
      }
    }
  );

  test(
    'XC-01-05: chapter search finds a Hindi chapter name (Class 9A Hindi Language)',
    { tag: ['@functional'] },
    async ({ user }) => {
      await user.nav.applyClassMap('navigationBoundary');
      await user.nav.openChaptersPopup();
      const first = ((await user.nav.chapterItems.first().innerText()) || '').replace(/^[\d.\s]+/, '').trim();
      const word = first.split(/\s+/).find((w) => /[ऀ-ॿ]/.test(w));
      expect(word, `a Devanagari word in the first chapter name ("${first}")`).toBeTruthy();
      await user.nav.chapterTpSearchToggle.click({ force: true }); // the search box only appears after its button
      await user.nav.searchContents(word);
      await expect(user.nav.chapterItems.filter({ hasText: word }).first(), `search for "${word}"`).toBeVisible();
    }
  );

  test(
    'XC-01-06: a file with a Hindi name is accepted, or refused with a message',
    { tag: ['@negative', '@bug'] },
    async ({ user, page }) => {
      test.fail(true, 'A file with a Hindi name is silently rejected (HTTP 400, no message) -- same bug as RES-08');
      const title = `Hindi file ${Date.now() % 100000}`;
      await user.addResource.createAsset(title, {
        name: 'पाठ योजना - विद्युत आवेश.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF'),
      });
      const card = user.playlist.resourceCards.filter({ hasText: title });
      const message = page.getByText(/not supported|invalid|failed|error|could not/i).first();
      const outcome = await Promise.race([
        card
          .first()
          .waitFor({ state: 'visible', timeout: 30000 })
          .then(() => 'accepted'),
        message.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'refused with a message'),
      ]).catch(() => 'nothing happened');
      if (outcome === 'accepted') await user.playlist.removeOwnedAsset(card.first());
      expect(outcome, 'the teacher sees the file accepted or a clear refusal').not.toBe('nothing happened');
    }
  );

  test(
    'XC-01-07: the on-screen keyboard can type Devanagari, or shows clearly that it cannot',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const menu = user.userMenu;
      await menu.openProfileMenu();
      const wasOn = (await menu.virtualKeyboardToggle.getAttribute('class').catch(() => '')).includes('checked');
      if (!wasOn) await menu.virtualKeyboardToggle.click({ force: true });
      await page.keyboard.press('Escape');
      try {
        await user.nav.openChaptersPopup();
        await user.nav.chapterTpSearchToggle.click({ force: true }); // the search box only appears after its button
        await user.nav.chapterTpSearchInput.click();
        const keyboard = page.locator('.simple-keyboard').filter({ visible: true }).first();
        await expect(keyboard, 'the on-screen keyboard opens').toBeVisible({ timeout: 10000 });
        const keys = await keyboard.innerText();
        test
          .info()
          .annotations.push({ type: 'note', description: `keys shown: ${keys.replace(/\s+/g, ' ').slice(0, 200)}` });
        const devanagari = /[ऀ-ॿ]/.test(keys) || /हिंदी|मराठी|hindi|marathi|language/i.test(keys);
        expect(devanagari, 'Devanagari keys or a language switch are offered').toBe(true);
      } finally {
        await page.keyboard.press('Escape');
        if (!wasOn) {
          await menu.openProfileMenu();
          await menu.virtualKeyboardToggle.click({ force: true });
          await page.keyboard.press('Escape');
        }
      }
    }
  );
});
