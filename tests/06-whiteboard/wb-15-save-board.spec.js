// WB-15 — Save the board to the Playlist or as a PDF
// Source: CEPV2_Stories/06_Whiteboard.md
// Add Resource -> Whiteboard opens a card with "Add to Playlist" and "Download PDF". Each test writes one stroke on
// fresh space first; a board saved to the Playlist is removed again at the end of the test.

const { test, expect } = require('../../fixtures');

test.use({ freshSpace: true });

/** Write one stroke and wait past the autosave countdown, then open the Whiteboard card. */
const writeAndOpenCard = async (user, page) => {
  await user.toolbar.penStroke({ x: 600, y: 400 }, { x: 860, y: 470 });
  await page.waitForTimeout(12000);
  await user.addResource.openAction('whiteboard');
};

/** Open the Save to Playlist dialog from the Whiteboard card. */
const openSaveDialog = async (user, page) => {
  await writeAndOpenCard(user, page);
  await user.whiteboard.addResourceWhiteboardSaveBtn.click({ force: true });
  await expect(user.whiteboard.saveBoardDialog, 'set-up: the Save dialog is open').toBeVisible({ timeout: 10000 });
};

test.describe('WB-15 Save the board', () => {
  test.describe.configure({ timeout: 180000 });

  test(
    'WB-15-01: the Whiteboard card offers Add to Playlist and Download PDF',
    { tag: ['@smoke', '@functional'] },
    async ({ user, page }) => {
      await writeAndOpenCard(user, page);
      await expect(user.whiteboard.addResourceWhiteboardSaveBtn, 'Add to Playlist').toBeVisible({ timeout: 10000 });
      await expect(user.whiteboard.addResourceWhiteboardDownloadBtn, 'Download PDF').toBeVisible();
    }
  );

  test(
    'WB-15-02: Add to Playlist opens a Save dialog with a board title already filled in',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await openSaveDialog(user, page);
      await expect(user.whiteboard.saveBoardTitleInput, 'a default title').toHaveValue(/\S{3,}/);
      await user.whiteboard.saveBoardDiscardBtn.click({ force: true });
    }
  );

  test(
    'WB-15-03: saving adds the board to the topic Playlist under its title',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await openSaveDialog(user, page);
      const title = `AutoTest-board-${Date.now()}`;
      await user.whiteboard.saveBoardTitleInput.fill(title);
      await user.whiteboard.saveBoardConfirmBtn.click({ force: true });
      const card = user.playlist.resourceCards.filter({ hasText: title });
      try {
        await expect(card, 'the saved board is in the Playlist').toHaveCount(1, { timeout: 20000 });
      } finally {
        if (await card.count()) await user.playlist.removeOwnedAsset(card.first()).catch(() => {});
      }
    }
  );

  test('WB-15-04: Discard closes the Save dialog and adds nothing', { tag: ['@negative'] }, async ({ user, page }) => {
    const before = await user.playlist.cardTitles();
    await openSaveDialog(user, page);
    await user.whiteboard.saveBoardDiscardBtn.click({ force: true });
    await expect(user.whiteboard.saveBoardDialog, 'the dialog closed').toBeHidden({ timeout: 10000 });
    await page.waitForTimeout(3000);
    expect(await user.playlist.cardTitles(), 'no card added').toEqual(before);
  });

  test(
    'WB-15-05: a saved board opens from the Playlist in its own panel, with Open in Whiteboard',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await openSaveDialog(user, page);
      const title = `AutoTest-board-${Date.now()}`;
      await user.whiteboard.saveBoardTitleInput.fill(title);
      await user.whiteboard.saveBoardConfirmBtn.click({ force: true });
      const card = user.playlist.resourceCards.filter({ hasText: title });
      try {
        await expect(card, 'set-up: the saved board is in the Playlist').toHaveCount(1, { timeout: 20000 });
        await card.first().click({ force: true });
        const panel = page
          .locator('mat-dialog-container, [role=dialog], .cdk-overlay-pane')
          .filter({ hasText: `Whiteboard: ${title}` });
        await expect(panel.first(), 'the saved board opens in its panel').toBeVisible({ timeout: 15000 });
        await expect(panel.first().getByText('Open in Whiteboard'), 'it can be opened in the whiteboard').toBeVisible();
        await page.keyboard.press('Escape');
      } finally {
        await page.reload();
        await user.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
        await user.playlist.ensureDrawerVisible();
        const left = user.playlist.resourceCards.filter({ hasText: title });
        if (await left.count()) await user.playlist.removeOwnedAsset(left.first()).catch(() => {});
      }
    }
  );

  test(
    'WB-15-06: Download PDF saves a PDF of the board',
    { tag: ['@functional'] },
    async ({ user, page, workerApp }) => {
      test.skip(!workerApp || !workerApp.app, 'needs the desktop client: the download is caught in the client');
      // The client would show a Windows save dialog; the download is caught in the client and saved to a temp file.
      await workerApp.app.evaluate(({ session }) => {
        global.__boardDownloads = [];
        session.defaultSession.removeAllListeners('will-download');
        session.defaultSession.on('will-download', (e, item) => {
          const target = require('path').join(require('os').tmpdir(), `board-${Date.now()}-${item.getFilename()}`);
          item.setSavePath(target);
          item.once('done', (ev, state) =>
            global.__boardDownloads.push({ name: item.getFilename(), state, bytes: item.getReceivedBytes() })
          );
        });
      });
      await writeAndOpenCard(user, page);
      await user.whiteboard.addResourceWhiteboardDownloadBtn.click({ force: true });
      await expect
        .poll(() => workerApp.app.evaluate(() => global.__boardDownloads), {
          message: 'a PDF is downloaded',
          timeout: 30000,
        })
        .toContainEqual(expect.objectContaining({ state: 'completed', name: expect.stringMatching(/\.pdf$/i) }));
    }
  );
});
