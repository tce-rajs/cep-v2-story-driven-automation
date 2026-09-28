// PLR-06 — View an image resource
// Source: CEPV2_Stories/11_Players.md
// Data: the 'playersDefault' topic holds an Image. The same hybrid-player crash as PLR-05-04 was once seen on Image.

const { test, expect } = require('../../fixtures');

test.describe('PLR-06 View an image resource', () => {
  test.use({ classMap: 'playersDefault' });

  const openImage = async (user) => {
    await expect(user.player.imageCards.first()).toBeAttached({ timeout: 10000 });
    await user.player.openResourceCard(user.player.imageCards);
  };

  /** Open image resources one by one until one actually loads; returns its index, or -1 if none does. CONFIRMED LIVE: this
   * topic's Playlist holds several image cards and some are stale assets whose file returns 404 (the player then shows a
   * blank, hidden image), so "the first image card" is not a safe thing to test rendering on. */
  const openWorkingImage = async (user) => {
    const { player } = user;
    const total = await player.imageCards.count();
    for (let i = 0; i < total; i++) {
      await player.openResourceCard(player.imageCards.nth(i));
      await player.isPlayerOpen(10000);
      await user.page.waitForTimeout(2500);
      const loaded = await player.imageGalleryImg
        .first()
        .evaluate((el) => el.complete && el.naturalWidth > 0)
        .catch(() => false);
      if (loaded) return i;
      await player.closePlayer();
    }
    return -1;
  };

  test('PLR-06-01: an image resource opens correctly', { tag: ['@smoke', '@functional'] }, async ({ user }) => {
    await openImage(user);
    expect(await user.player.isPlayerOpen(), 'the image player opened').toBe(true);
    await expect(user.player.imageWrapper).toBeVisible({ timeout: 15000 });
    // isPlayerOpen()/toBeVisible() only prove the close icon and wrapper exist — not that the player occupies a
    // real amount of screen, not a broken sliver. CONFIRMED LIVE: a correctly-opened image player is ~980x620.
    await expect
      .poll(async () => (await user.player.imageWrapper.boundingBox())?.width || 0, {
        message: 'the image player finishes rendering to a real size',
        timeout: 15000,
      })
      .toBeGreaterThan(150);
    const box = await user.player.imageWrapper.boundingBox();
    expect(box.height, 'the image player renders at a real size, not collapsed').toBeGreaterThan(150);
  });

  test('PLR-06-02: the image renders correctly', { tag: ['@functional'] }, async ({ user }) => {
    // CONFIRMED LIVE (2026-09-20): this topic's only remaining image card is a stale asset whose file 404s, so when no
    // curriculum image loads the test uploads its own image (a real 1x1 PNG, which does render) and removes it again.
    let ownTitle = null;
    let ownCard = null;
    try {
      if ((await openWorkingImage(user)) < 0) {
        ownTitle = `AutoTest-image-${Date.now()}`;
        await user.addResource.createImageAsset(ownTitle);
        ownCard = user.playlist.resourceCards.filter({ hasText: ownTitle });
        await expect(ownCard.first(), 'the uploaded image shows up in the Playlist').toBeVisible({ timeout: 20000 });
        await user.player.openResourceCard(ownCard);
        await user.player.isPlayerOpen(10000);
        await user.page.waitForTimeout(2500);
      }
      const img = user.player.imageGalleryImg.first();
      await expect(img).toBeVisible({ timeout: 15000 });

      const drawn = await img.evaluate((el) => ({
        loaded: el.complete && el.naturalWidth > 0,
        natural: el.naturalWidth,
      }));
      expect(drawn.loaded, 'the image file actually loaded').toBe(true);
      const box = await img.boundingBox();
      // A 1x1 source is scaled up to fill the viewer, so it is still drawn at a real size.
      expect(box.width, 'and is drawn at a real size').toBeGreaterThan(50);
      expect(box.height).toBeGreaterThan(50);
    } finally {
      if (ownCard) {
        await user.player.closePlayer().catch(() => {});
        await user.playlist.ensureDrawerVisible().catch(() => {});
        await user.playlist.removeOwnedAsset(ownCard).catch(() => {});
      }
    }
  });

  test(
    'PLR-06-03: the hybrid-player crash on Image does not recur',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await openImage(user);
      await page.waitForTimeout(5000);
      await user.player.closePlayer();

      expect(
        errors.filter((e) => /targetContainer|tce-player-hybrid/i.test(e)),
        'the "targetContainer is not defined" hybrid-player error'
      ).toEqual([]);
    }
  );

  test(
    'PLR-06-04: an image that fails to load shows an error, not a blank player',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      // CONFIRMED LIVE (v 0.0.223): unlike a PDF that will not load (a silent blank loader, PL-01-06), the image player
      // handles a failed load properly -- an icon and "Unable to load the image!" with a close button. The failure is
      // reproduced deterministically by blocking the image file.
      const block = (route) => route.abort();
      const pattern = /fileservice\/.*\.(jpe?g|png|gif)(\?|$)/i;
      await page.route(pattern, block);
      try {
        await openImage(user);
        await user.page.waitForTimeout(3500);
        await expect(
          page.getByText(/unable to|couldn.?t (load|open)|failed to load|error|not found|try again|corrupt/i).first(),
          'an error message is shown'
        ).toBeVisible({ timeout: 8000 });
      } finally {
        await page.unroute(pattern, block);
      }
    }
  );

  test.fixme('PLR-06-05: zooming and panning work on an open image', async () => {
    // STORY vs APP, CONFIRMED LIVE (2026-09-26, v 0.0.232): the image player has no zoom or pan control, and the mouse
    // wheel over the image does nothing (the image stayed 981px wide). The story came from the reference suite's
    // PLR-IMG-03. Owner to decide: drop the case, or raise a product gap.
  });
});
