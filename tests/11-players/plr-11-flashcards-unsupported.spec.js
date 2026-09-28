// PLR-11 — Flashcards and unsupported files
// Source: CEPV2_Stories/11_Players.md
// Data: flashcards live in 'flashcard' (Class 8R Mathematics, "Foundation Checkpoint"; topic found by name, 0..4);
// the unsupported-file case creates its own .txt asset (a type the app cannot play) and removes it.

const { test, expect } = require('../../fixtures');

test.describe('PLR-11 Flashcards and unsupported files', () => {
  test.afterEach(async ({ app }) => {
    await app.player.closePlayer().catch(() => {});
  });

  test('PLR-11-01: a flashcard resource pages through its cards', { tag: ['@functional'] }, async ({ user, page }) => {
    await user.nav.applyClassMap('flashcard');
    await user.playlist.ensureDrawerVisible();
    let cards = user.playlist.resourceCards.filter({ hasText: /flash\s*card/i });
    for (let t = 1; t < 5 && (await cards.count()) === 0; t++) {
      await user.nav.goToChapterTopicByName('Foundation Checkpoint', t).catch(() => {});
      await user.playlist.ensureDrawerVisible();
      cards = user.playlist.resourceCards.filter({ hasText: /flash\s*card/i });
    }
    expect(await cards.count(), 'a flashcard resource in this chapter').toBeGreaterThan(0);
    await user.player.openResourceCard(cards.first());
    expect(await user.player.isPlayerOpen()).toBe(true);
    const next = page
      .getByRole('button', { name: /next/i })
      .or(page.locator('li.page-item.next-item'))
      .filter({ visible: true })
      .first();
    const shown = page
      .locator('.flashcard, [class*="flash-card"], [class*="flashcard"]')
      .filter({ visible: true })
      .first();
    await expect(shown).toBeVisible({ timeout: 15000 });
    const first = await shown.innerText();
    await next.click({ force: true });
    await expect.poll(() => shown.innerText(), { message: 'the next card is shown' }).not.toBe(first);
  });

  test(
    'PLR-11-02: a file type the app cannot play shows "Unsupported file" with a Download option',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await user.nav.applyClassMap('tceUnsupported');
      await user.playlist.ensureDrawerVisible();
      const title = `AutoTest-unsupported-${Date.now()}`;
      await user.addResource.createTextAsset(title);
      const card = user.playlist.resourceCards.filter({ hasText: title });
      try {
        await expect(card).toBeVisible({ timeout: 15000 });
        await user.player.openResourceCard(card);
        await expect(page.getByText(/unsupported file/i).first()).toBeVisible({ timeout: 15000 });
        await expect(
          page
            .getByRole('button', { name: /download/i })
            .or(page.getByText(/^\s*download\s*$/i))
            .first()
        ).toBeVisible();
      } finally {
        await user.player.closePlayer().catch(() => {});
        await user.playlist.ensureDrawerVisible();
        await user.playlist.removeOwnedAsset(card).catch(() => {});
      }
    }
  );
});
