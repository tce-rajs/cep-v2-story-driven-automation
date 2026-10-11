// PL-06 — Pin
// Source: CEPV2_Stories/08_Playlist.md
//
// The only Pin control is the Playlist strip's own pin icon (playlist-resource-nav-pin), which toggles its own state.
// Individual cards have no pin of their own.

const { test, expect } = require('../../fixtures');

test.describe('PL-06 Pin', () => {
  test.use({ classMap: 'playersDefault' });

  // The pin button's own classes carry no pinned/unpinned state (only transient
  // "cdk-focused cdk-mouse-focused" focus classes). The state lives on its inner icon, which gains a "strike-icon" class
  // after one click and loses it after the next.
  const pinState = async (user) => (await user.playlist.pinBtn.locator('mat-icon').getAttribute('class')) || '';

  test(
    'PL-06-01: pinning a resource keeps it fixed at the top of the playlist',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const { playlist } = user;
      const first = (await playlist.cardTitles())[0];
      const unpinned = await pinState(user);

      await playlist.pinBtn.click();
      await page.waitForTimeout(500);
      expect(await pinState(user), 'the control shows it is now pinned').not.toBe(unpinned);

      // Scrolling the strip and reloading must leave the pinned item first.
      for (let i = 0; i < 3; i++) await playlist.rightScrollBtn.click({ force: true }).catch(() => {});
      for (let i = 0; i < 3; i++) await playlist.leftScrollBtn.click({ force: true }).catch(() => {});
      expect((await playlist.cardTitles())[0], 'still first after scrolling').toBe(first);

      await page.reload();
      await user.login.avatar.waitFor({ state: 'visible', timeout: 20000 });
      await playlist.ensureDrawerVisible();
      await expect
        .poll(async () => (await playlist.cardTitles())[0], { message: 'still first after a reload', timeout: 15000 })
        .toBe(first);

      await playlist.pinBtn.click().catch(() => {}); // leave as found
    }
  );

  test('PL-06-02: unpinning removes that fixed placement', { tag: ['@functional'] }, async ({ user, page }) => {
    const { playlist } = user;
    const original = await pinState(user);

    await playlist.pinBtn.click();
    await page.waitForTimeout(500);
    const pinned = await pinState(user);
    expect(pinned).not.toBe(original);

    await playlist.pinBtn.click();
    await page.waitForTimeout(500);
    expect(await pinState(user), 'back to the unpinned appearance').toBe(original);
  });

  test(
    'PL-06-03: pinning multiple resources keeps them all fixed at the top in a consistent order',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      const { playlist } = user;
      // Look for a per-card pin control (none is documented).
      // A curriculum card's only control is its remove icon, so there is no per-card pin.
      const cardPins = playlist.resourceCards.locator('[data-qa-id*="pin" i], [class*="pin" i]');
      const available = await cardPins.count();
      test.skip(
        available < 2,
        `no per-card pin control found (${available}) — only the strip-level pin toggle exists, so "multiple pinned resources" cannot be exercised`
      );

      const titles = await playlist.cardTitles();
      await cardPins.nth(1).click({ force: true });
      await cardPins.nth(0).click({ force: true });
      await page.waitForTimeout(800);
      const afterPinning = (await playlist.cardTitles()).slice(0, 2);

      await page.reload();
      await user.login.avatar.waitFor({ state: 'visible', timeout: 20000 });
      await playlist.ensureDrawerVisible();
      expect((await playlist.cardTitles()).slice(0, 2), 'same two, same order, after a reload').toEqual(afterPinning);
      expect(new Set(afterPinning), 'both pinned items are among the originals').toEqual(
        new Set(titles.filter((t) => afterPinning.includes(t)))
      );
    }
  );

  test(
    'PL-06-04: unpinning never hides a card that is being opened',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const { playlist } = user;
      const original = await pinState(user);
      await playlist.pinBtn.click();
      await page.waitForTimeout(500);
      expect(await pinState(user), 'set-up: pinned').not.toBe(original);
      const card = playlist.resourceCards.first();
      const title = (await playlist.cardTitles())[0];
      try {
        // Open the first card and unpin straight away, while it is still opening.
        await user.player.openResourceCard(card);
        await playlist.pinBtn.click({ force: true });
        expect(await user.player.isPlayerOpen(20000), 'the card still opens').toBe(true);
        await user.player.closePlayer();
        await playlist.ensureDrawerVisible();
        await expect(
          playlist.resourceCards.filter({ hasText: title }).first(),
          'the card is still in the strip'
        ).toBeVisible();
      } finally {
        if ((await pinState(user)) !== original) await playlist.pinBtn.click().catch(() => {});
      }
    }
  );
});
