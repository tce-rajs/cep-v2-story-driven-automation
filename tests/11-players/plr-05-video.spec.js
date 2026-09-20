// PLR-05 — Play a video resource
// Source: CEPV2_Stories/11_Players.md
// Data: the 'playersDefault' topic holds a Video. CONFIRMED LIVE in the previous suite: opening it could throw
// "ReferenceError: targetContainer is not defined" from tceplayer-two/tce-player-hybrid.js (the "hybrid-player crash").

const { test, expect } = require('../../fixtures');

test.describe('PLR-05 Play a video resource', () => {
  test.use({ classMap: 'playersDefault' });

  const openVideo = async (user) => {
    await expect(user.player.videoCards.first()).toBeAttached({ timeout: 10000 });
    await user.player.openResourceCard(user.player.videoCards);
    expect(await user.player.isPlayerOpen(), 'the video player opened').toBe(true);
    await expect(user.player.videoNavPlayBtn).toBeVisible({ timeout: 15000 });
    await expect(user.player.videoElement).toBeAttached();
    // Clicking play the instant the player appears does nothing (CONFIRMED LIVE): wait for the video to have loaded.
    await expect
      .poll(async () => (await user.player.videoState()).readyState, {
        message: 'the video has loaded',
        timeout: 20000,
      })
      .toBeGreaterThanOrEqual(3);
  };

  test(
    'PLR-05-01: a video resource opens and plays correctly',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await openVideo(user);
      expect((await user.player.videoState()).paused, 'it starts paused').toBe(true);
      await user.player.toggleVideoPlayback();
      await expect
        .poll(async () => !(await user.player.videoState()).paused, { message: 'it is playing', timeout: 15000 })
        .toBe(true);
      await expect
        .poll(async () => (await user.player.videoState()).currentTime, {
          message: 'the picture advances',
          timeout: 15000,
        })
        .toBeGreaterThan(0.5);
    }
  );

  test('PLR-05-02: pausing the video works correctly', { tag: ['@functional'] }, async ({ user }) => {
    await openVideo(user);
    await user.player.toggleVideoPlayback();
    await expect.poll(async () => !(await user.player.videoState()).paused, { timeout: 15000 }).toBe(true);

    await user.player.toggleVideoPlayback();
    await expect
      .poll(async () => (await user.player.videoState()).paused, { message: 'it is paused', timeout: 10000 })
      .toBe(true);
    // ...and stays where it stopped.
    const stopped = (await user.player.videoState()).currentTime;
    await user.page.waitForTimeout(1500);
    expect((await user.player.videoState()).currentTime, 'the position holds while paused').toBeCloseTo(stopped, 1);
  });

  test('PLR-05-03: closing the video works correctly', { tag: ['@functional'] }, async ({ user }) => {
    await openVideo(user);
    await user.player.closePlayer();

    expect(await user.player.isPlayerOpen(3000), 'the player is gone').toBe(false);
    await expect(user.player.videoElement).toHaveCount(0);
    await expect(user.playlist.contentsTile, 'back on the Playlist').toBeVisible();
  });

  test(
    'PLR-05-04: the hybrid-player crash on Video does not recur',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await expect(user.player.videoCards.first()).toBeAttached({ timeout: 10000 });
      await user.player.openResourceCard(user.player.videoCards);
      await page.waitForTimeout(5000);
      await user.player.closePlayer();

      expect(
        errors.filter((e) => /targetContainer|tce-player-hybrid/i.test(e)),
        'the "targetContainer is not defined" hybrid-player error'
      ).toEqual([]);
    }
  );
});
