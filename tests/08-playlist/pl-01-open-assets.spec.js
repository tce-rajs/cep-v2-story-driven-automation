// PL-01 — Open assets from Playlist
// Source: CEPV2_Stories/08_Playlist.md
// Assets = PDF (a "Worksheet" card), Quiz, Video and other resource types. Ebook is PL-02.
//
// Data: the 'playersDefault' topic (Class 12A Computer Science, "14. Project Based Learning") holds one
// Worksheet/PDF, Video, Image and Weblink; the 'quiz' topic (Class 11A Accountancy, chapter 3) holds a Quiz.

const { test, expect } = require('../../fixtures');

test.describe('PL-01 Open assets from Playlist', () => {
  test.describe('PDF, video and playlist behaviour', () => {
    test.use({ classMap: 'playersDefault' });

    test(
      'PL-01-01: opening a PDF asset from Playlist loads it correctly',
      { tag: ['@smoke', '@functional'] },
      async ({ user }) => {
        const { player } = user;
        await expect(player.worksheetCards.first()).toBeAttached({ timeout: 10000 });
        await player.openResourceCard(player.worksheetCards);

        expect(await player.isPlayerOpen(), 'the PDF player opened').toBe(true);
        await expect(player.worksheetHeader.or(user.page.locator('canvas').first())).toBeVisible({ timeout: 15000 });
        await player.closePlayer();
      }
    );

    test(
      'PL-01-03: opening a Video asset from Playlist loads it correctly',
      { tag: ['@smoke', '@functional'] },
      async ({ user }) => {
        const { player } = user;
        await expect(player.videoCards.first()).toBeAttached({ timeout: 10000 });
        await player.openResourceCard(player.videoCards);

        expect(await player.isPlayerOpen(), 'the video player opened').toBe(true);
        await expect(player.videoFrame.or(player.videoPlayToggle)).toBeVisible({ timeout: 15000 });
        await player.closePlayer();
      }
    );

    test(
      'PL-01-04: the Playlist always shows the assets that have been added — it is not empty when assets exist',
      { tag: ['@functional'] },
      async ({ user }) => {
        const before = await user.playlist.resourceCards.count();
        expect(before, 'this topic has assets, so the Playlist shows them').toBeGreaterThan(0);

        // And a freshly added asset shows up straight away.
        const title = `AutoTest-${Date.now()}`;
        await user.addResource.createTextAsset(title);
        const added = user.playlist.resourceCards.filter({ hasText: title });
        await expect(added).toBeVisible({ timeout: 15000 });
        await expect(user.playlist.resourceCards).toHaveCount(before + 1);

        // Leave the shared topic as found.
        await user.playlist.removeOwnedAsset(added);
      }
    );

    test(
      'PL-01-05: the user can open several assets in sequence without one interfering with the next',
      { tag: ['@functional'] },
      async ({ user }) => {
        const { player } = user;
        for (const [name, cards] of [
          ['video', player.videoCards],
          ['PDF', player.worksheetCards],
          ['image', player.imageCards],
          ['video again', player.videoCards],
        ]) {
          await expect(cards.first(), `${name} card present`).toBeAttached({ timeout: 10000 });
          await player.openResourceCard(cards);
          expect(await player.isPlayerOpen(), `${name} opened`).toBe(true);
          await player.closePlayer();
          expect(await player.isPlayerOpen(3000), `${name} closed before opening the next`).toBe(false);
        }
      }
    );

    test(
      'PL-01-06: an asset that failed to load or is corrupted shows an error, not a silent failure',
      { tag: ['@negative', '@bug'] },
      async ({ user, page }) => {
        // PRODUCT FINDING, CONFIRMED LIVE (v 0.0.223, screenshot-verified): when the PDF's file request fails
        // (net::ERR_FAILED) the app shows a dark screen with a spinner and nothing else -- no error message and no
        // visible close button, so the teacher is stuck on a loader. Tracked as expected-to-fail so it isn't masked.
        test.fail(true, 'A PDF that fails to load leaves a blank loader with no error message');
        // Make every media/document file request fail, then open the PDF asset.
        const blockFiles = (route) => route.abort();
        await page.route(/\.(pdf|mp4|m3u8|webm|jpe?g|png)(\?|$)/i, blockFiles);
        try {
          const { player } = user;
          await expect(player.worksheetCards.first()).toBeAttached({ timeout: 10000 });
          await player.openResourceCard(player.worksheetCards);
          await page.waitForTimeout(3000);

          // Silent failure would be a blank player with no message at all.
          await expect(
            page.getByText(/unable to|couldn.?t (load|open)|failed to load|error|not found|try again|corrupt/i).first(),
            'an error message is shown'
          ).toBeVisible({ timeout: 10000 });
        } finally {
          // The app window is shared by later tests, so the block must not outlive this one.
          await page.unroute(/\.(pdf|mp4|m3u8|webm|jpe?g|png)(\?|$)/i, blockFiles);
        }
      }
    );
  });

  test.describe('Quiz', () => {
    test.use({ classMap: 'quiz' });

    test(
      'PL-01-02: opening a Quiz asset from Playlist loads it correctly',
      { tag: ['@smoke', '@functional'] },
      async ({ user }) => {
        const { player } = user;
        await expect(player.quizCards.first()).toBeAttached({ timeout: 10000 });
        await player.openResourceCard(player.quizCards);

        // The quiz opens on its launch screen first (then the class-strength step, then the questions).
        await expect(player.quizLaunchScreenBtn.or(player.quizRenderer)).toBeVisible({ timeout: 15000 });
      }
    );
  });
});
