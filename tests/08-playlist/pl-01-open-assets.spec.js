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
        const rendered = player.worksheetHeader.or(user.page.locator('canvas').first());
        await expect(rendered).toBeVisible({ timeout: 15000 });
        // isPlayerOpen()/toBeVisible() only prove the close icon and a header/canvas exist — not that the PDF
        // occupies a real amount of screen. CONFIRMED LIVE: the canvas can still be mid-layout (a narrow sliver)
        // right after becoming visible, then settle to its real ~1200px-tall size — poll rather than measure once.
        // CONFIRMED LIVE on a second server: a real multi-page curriculum PDF can take longer than 10s to settle
        // (a synthetic single-page test PDF settled well within that); 20s covers both.
        await expect
          .poll(async () => (await rendered.first().boundingBox())?.width || 0, {
            message: 'the PDF finishes rendering to a real size',
            timeout: 20000,
          })
          .toBeGreaterThan(150);
        const box = await rendered.first().boundingBox();
        expect(box.height, 'the PDF renders at a real size, not collapsed').toBeGreaterThan(150);
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
        // isPlayerOpen()/toBeVisible() only prove the close icon and frame/toggle exist — not that the video
        // occupies a real amount of screen. CONFIRMED LIVE: a correctly-opened video element is ~300x185.
        await expect(player.videoElement).toBeAttached({ timeout: 15000 });
        await expect
          .poll(async () => (await player.videoElement.boundingBox())?.width || 0, {
            message: 'the video finishes rendering to a real size',
            timeout: 10000,
          })
          .toBeGreaterThan(100);
        const box = await player.videoElement.boundingBox();
        expect(box.height, 'the video renders at a real size, not collapsed').toBeGreaterThan(80);
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
        for (const [name, cards, rendered] of [
          ['video', player.videoCards, player.videoElement],
          ['PDF', player.worksheetCards, player.worksheetHeader.or(user.page.locator('canvas').first())],
          ['image', player.imageCards, player.imageWrapper.or(player.imageGalleryImg).first()],
          ['video again', player.videoCards, player.videoElement],
        ]) {
          await expect(cards.first(), `${name} card present`).toBeAttached({ timeout: 10000 });
          await player.openResourceCard(cards);
          expect(await player.isPlayerOpen(), `${name} opened`).toBe(true);
          // isPlayerOpen() only proves the close icon exists, not that a leftover from the PREVIOUS player didn't
          // leave this one rendering broken/collapsed. CONFIRMED LIVE elsewhere in this suite: each of these types
          // renders at 100px+/80px+ when working correctly.
          await expect
            .poll(async () => (await rendered.boundingBox())?.width || 0, {
              message: `the ${name} finishes rendering to a real size`,
              timeout: 20000,
            })
            .toBeGreaterThan(100);
          const box = await rendered.boundingBox();
          expect(box.height, `the ${name} renders at a real size, not collapsed`).toBeGreaterThan(80);
          await player.closePlayer();
          expect(await player.isPlayerOpen(3000), `${name} closed before opening the next`).toBe(false);
        }
      }
    );

    test(
      'PL-01-06: an asset that failed to load or is corrupted shows an error, not a silent failure',
      { tag: ['@negative'] },
      async ({ user, page }) => {
        // NOTE: v0.0.223 showed a blank loader with no error message here (tracked at the time as a confirmed
        // product bug). Re-tested 2026-09-23: a real error message now appears reliably, including in isolation.
        // Reverted the test.fail() marking since it currently works correctly.
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
        const rendered = player.quizLaunchScreenBtn.or(player.quizRenderer);
        await expect(rendered).toBeVisible({ timeout: 15000 });
        // Being visible only proves an element exists, not that the quiz occupies a real amount of screen, not a
        // broken sliver. CONFIRMED LIVE: the "Launch AIR Card" button is a small button by design (~50px tall), so
        // only size-check once past it, when the full renderer (~980x740 in this window) is what's showing.
        if (await player.quizRenderer.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect
            .poll(async () => (await player.quizRenderer.boundingBox())?.width || 0, {
              message: 'the quiz finishes rendering to a real size',
              timeout: 10000,
            })
            .toBeGreaterThan(150);
          const box = await player.quizRenderer.boundingBox();
          expect(box.height, 'the quiz renders at a real size, not collapsed').toBeGreaterThan(150);
        }
      }
    );
  });
});
