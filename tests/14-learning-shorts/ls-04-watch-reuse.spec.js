// LS-04 — Watch and reuse Learning Shorts
// Source: CEPV2_Stories/14_LearningShorts.md
// A short is saved to this topic's Playlist first (real action, owner-approved), so there is always one to watch.

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'default' });

/** Record and save a short to the Playlist; returns its title. */
async function saveShort(user) {
  const ls = user.learningShorts;
  const title = `AutoTest watch ${Date.now()}`;
  await ls.openRecorder(user.magnet);
  await ls.record(4);
  await ls.titleInput.fill(title);
  await ls.savePlaylistBtn.click();
  await expect(ls.titleInput).toBeHidden({ timeout: 30000 });
  return title;
}

test.describe('LS-04 Watch and reuse Learning Shorts', () => {
  test.afterEach(async ({ app }) => {
    await app.player.closePlayer().catch(() => {});
    await app.learningShorts.closeAll();
  });

  test(
    'LS-04-01: a Learning Shorts card in the Playlist opens a video player that plays it',
    { tag: ['@functional'] },
    async ({ user }) => {
      const title = await saveShort(user);
      const card = user.playlist.resourceCards.filter({ hasText: title });
      await expect(card.first()).toBeAttached({ timeout: 30000 });
      await user.player.openResourceCard(card);
      expect(await user.player.isPlayerOpen(), 'a player opened').toBe(true);
      const video = user.page.locator('video').filter({ visible: true }).first();
      await expect(video).toBeVisible({ timeout: 20000 });
      await video.evaluate((v) => v.play().catch(() => {}));
      await expect
        .poll(() => video.evaluate((v) => v.currentTime), { message: 'the short plays', timeout: 15000 })
        .toBeGreaterThan(0.3);
    }
  );

  test(
    "LS-04-02: Send from an owned Video card's menu opens the Learning Shorts composer with that video attached",
    { tag: ['@functional'] },
    async ({ user }) => {
      const title = await saveShort(user);
      const card = user.playlist.resourceCards.filter({ hasText: title }).first();
      await expect(card).toBeAttached({ timeout: 30000 });
      // The card menu (with Send) exists only in Edit mode (confirmed live 2026-09-26).
      await user.playlist.ensureDrawerVisible();
      await user.playlist.enterEditMode();
      await card.scrollIntoViewIfNeeded();
      await card.hover();
      await card.locator('[data-qa-id="playlist-asset-overflow-icon-btn"]').click({ force: true });
      await user.learningShorts.assetSendBtn.filter({ visible: true }).first().click({ force: true });
      await expect(user.learningShorts.titleInput, 'Learning Shorts composer opened').toBeVisible({ timeout: 20000 });
      // The composer for a saved short is the one with classes and Send; the saved video is what gets sent
      // (there is no attachment preview in this build).
      await expect(user.learningShorts.sendBtn, 'ready to send that short').toBeVisible({ timeout: 15000 });
      await expect(user.learningShorts.titleInput, 'the short being sent').toHaveValue(title);
    }
  );
});
