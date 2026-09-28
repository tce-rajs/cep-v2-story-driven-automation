// PLR-12 — Players in general
// Source: CEPV2_Stories/11_Players.md
// Data: 'playersDefault' holds one Worksheet, Image, Video and Weblink.

const { test, expect } = require('../../fixtures');

test.describe('PLR-12 Players in general', () => {
  test.use({ classMap: 'playersDefault' });

  test.afterEach(async ({ app }) => {
    for (let i = 0; i < 3; i++) await app.player.closePlayer().catch(() => {});
  });

  const openPlayers = (page) =>
    page
      .locator('.player.image-player, .player.weblink-player, .pdfViewer, lib-quiz-renderer, iframe[src*="video" i]')
      .filter({ visible: true });

  test(
    'PLR-12-01: opening 3 different kinds of player quickly opens each one cleanly',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      // CONFIRMED LIVE (2026-09-26): several players can be open at once by design (PLR-03-08 relies on it), so opening
      // three quickly must leave three working players -- the story's "only the last one open" was wrong (story updated).
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      const p = user.player;
      for (const cards of [p.worksheetCards, p.imageCards, p.weblinkCards]) {
        await expect(cards.first()).toBeAttached({ timeout: 10000 });
        await p.openResourceCard(cards);
      }
      await page.waitForTimeout(5000);
      await expect(p.weblinkWrapper, 'the web link player is open').toBeVisible({ timeout: 15000 });
      await expect(p.imageWrapper, 'the image player is open').toBeVisible();
      await expect(openPlayers(page), 'three players, no duplicates').toHaveCount(3);
      expect(errors).toEqual([]);
    }
  );

  test(
    'PLR-12-02: closing a player the moment it opens leaves nothing behind',
    { tag: ['@bug', '@edge'] },
    async ({ user, page }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232; seen in the full run and again on its own): closing a
      // worksheet the moment it opens leaves a player close icon on screen -- a leftover player the teacher has to close again.
      test.fail(true, 'Closing a worksheet the moment it opens leaves a leftover player on screen');
      const p = user.player;
      await p.openResourceCard(p.worksheetCards);
      await p.closeIcon.first().waitFor({ state: 'visible', timeout: 15000 });
      await p.closeIcon.first().click({ force: true });
      await page.waitForTimeout(3000);
      await expect(p.closeIcon, 'no player left').toHaveCount(0);
      await expect(openPlayers(page)).toHaveCount(0);
    }
  );

  test(
    'PLR-12-03: opening the same resource card 6 times quickly opens it only once',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      const p = user.player;
      await expect(p.imageCards.first()).toBeAttached({ timeout: 10000 });
      await p.imageCards.first().evaluate((el) => {
        el.scrollIntoView({ block: 'center' });
        for (let i = 0; i < 6; i++) el.click();
      });
      await page.waitForTimeout(5000);
      await expect(p.imageWrapper.filter({ visible: true }), 'one image player').toHaveCount(1);
    }
  );
});
