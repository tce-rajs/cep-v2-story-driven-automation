// PLR-12 — Players in general
// Source: CEPV2_Stories/11_Players.md
// Data: 'playersDefault' holds a Worksheet and an Image; 'playersWeblink' holds a Worksheet, Image and Web link.

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

  // The Worksheet, Image and Web link sit together in the 'playersWeblink' topic.
  test.describe(() => {
    test.use({ classMap: 'playersWeblink' });

    test(
      'PLR-12-01: opening 3 different kinds of player quickly opens each one cleanly',
      { tag: ['@edge'] },
      async ({ user, page }) => {
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
  });

  test(
    'PLR-12-02: closing a player the moment it opens leaves nothing behind',
    { tag: ['@edge'] },
    async ({ user, page }) => {
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

  // Worksheet, Image, Web link and Video, one after another: each closes without leaving anything behind.
  test.describe(() => {
    test.use({ classMap: 'playersWeblink' });

    test(
      'PLR-12-04: closing any player leaves no blank panel or stray close icon behind',
      { tag: ['@negative'] },
      async ({ user }) => {
        const p = user.player;
        const left = {};
        for (const [kind, cards] of [
          ['worksheet', p.worksheetCards],
          ['image', p.imageCards],
          ['web link', p.weblinkCards],
          ['video', p.videoCards],
        ]) {
          await expect(cards.first(), `set-up: a ${kind} in this topic`).toBeAttached({ timeout: 10000 });
          await p.openResourceCard(cards);
          expect(await p.isPlayerOpen(), `set-up: the ${kind} opened`).toBe(true);
          await user.page.waitForTimeout(2000);
          await p.closePlayer();
          left[kind] = await p.leftoversAfterClose();
        }
        test.info().annotations.push({ type: 'note', description: `After closing: ${JSON.stringify(left)}` });
        for (const [kind, l] of Object.entries(left)) {
          expect(l.closeIcons, `${kind}: no stray close icon`).toBe(0);
          expect(l.panels, `${kind}: no blank panel`).toBe(0);
          expect(l.boardOnTop, `${kind}: the board is on screen again`).toBe(true);
        }
      }
    );
  });
});
