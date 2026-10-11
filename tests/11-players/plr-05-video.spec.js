// PLR-05 — Play a video resource
// Source: CEPV2_Stories/11_Players.md
// Data: the 'playersDefault' topic holds a Video. The tests also watch for script errors from the player
// (e.g. "ReferenceError: targetContainer is not defined" from tce-player-hybrid.js).

const { test, expect } = require('../../fixtures');

test.describe('PLR-05 Play a video resource', () => {
  test.use({ classMap: 'playersDefault' });

  const openVideo = async (user) => {
    await expect(user.player.videoCards.first()).toBeAttached({ timeout: 10000 });
    await user.player.openResourceCard(user.player.videoCards);
    expect(await user.player.isPlayerOpen(), 'the video player opened').toBe(true);
    await expect(user.player.videoNavPlayBtn).toBeVisible({ timeout: 15000 });
    await expect(user.player.videoElement).toBeAttached();
    // Clicking play the instant the player appears does nothing: wait for the video to have loaded.
    await expect
      .poll(async () => (await user.player.videoState()).readyState, {
        message: 'the video has loaded',
        timeout: 20000,
      })
      .toBeGreaterThanOrEqual(3);
    // isPlayerOpen()/toBeAttached() only prove the close icon and video element exist — not that it occupies a
    // real amount of screen. A correctly-opened video element is ~300x185 in this window.
    const box = await user.player.videoElement.boundingBox();
    expect(box.width, 'the video renders at a real size, not collapsed').toBeGreaterThan(100);
    expect(box.height, 'the video renders at a real size, not collapsed').toBeGreaterThan(80);
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

  // Seeking (PLR-05-05) and volume/mute (PLR-05-09): one test each.
  test('PLR-05-05: seeking a video moves playback to the chosen point', { tag: ['@functional'] }, async ({ user }) => {
    await openVideo(user);
    const v = user.player.videoElement;
    const duration = (await user.player.videoState()).duration;
    await v.evaluate((el, t) => (el.currentTime = t), duration / 2);
    await expect
      .poll(async () => Math.round((await user.player.videoState()).currentTime), { message: 'seeked to the middle' })
      .toBeGreaterThanOrEqual(Math.floor(duration / 2) - 1);
    await user.player.closePlayer();
  });

  test('PLR-05-09: a video’s volume can be changed and muted', { tag: ['@functional'] }, async ({ user }) => {
    await openVideo(user);
    const v = user.player.videoElement;
    await v.evaluate((el) => (el.volume = 0.3));
    expect(await v.evaluate((el) => el.volume)).toBeCloseTo(0.3, 1);
    await v.evaluate((el) => (el.muted = true));
    expect(await v.evaluate((el) => el.muted)).toBe(true);
    await user.player.closePlayer();
  });

  test('PLR-05-07: opening something else stops the video', { tag: ['@functional'] }, async ({ user }) => {
    await openVideo(user);
    await user.player.toggleVideoPlayback();
    await expect.poll(async () => (await user.player.videoState()).paused).toBe(false);
    await user.player.openResourceCard(user.player.worksheetCards);
    await user.page.waitForTimeout(3000);
    const still = await user.player.videoState().catch(() => ({ paused: true }));
    expect(still.paused, 'the video is not still playing').toBe(true);
    await user.player.closePlayer();
    await user.player.closePlayer();
  });

  test(
    'PLR-05-08: double-clicking a video card opens only one player (regression)',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      await expect(user.player.videoCards.first()).toBeAttached({ timeout: 10000 });
      await user.player.videoCards.first().evaluate((el) => {
        el.scrollIntoView({ block: 'center' });
        el.click();
        el.click();
      });
      await page.waitForTimeout(6000);
      expect(await page.frameLocator('iframe').locator('video').count(), 'one video player').toBeLessThanOrEqual(1);
      await user.player.closePlayer();
    }
  );

  // A network drop while the video plays: a message is shown (PLR-05-10), and playback resumes once the network is
  // back (PLR-05-11) -- one test each.
  const playThenCutNetwork = async (user, page) => {
    await openVideo(user);
    await user.player.toggleVideoPlayback();
    await expect.poll(async () => !(await user.player.videoState()).paused, { message: 'set-up: playing' }).toBe(true);
    await page.route('**/*', (route) => route.abort('internetdisconnected'));
  };

  test(
    'PLR-05-10: a network drop while a video plays shows a message',
    { tag: ['@interruption'] },
    async ({ user, page }) => {
      test.setTimeout(150000);
      await playThenCutNetwork(user, page);
      try {
        await expect(
          page
            .getByText(/network|offline|connection|error|unable|try again|retry/i)
            .filter({ visible: true })
            .first(),
          'the teacher is told the video cannot continue'
        ).toBeVisible({ timeout: 45000 });
      } finally {
        await page.unroute('**/*');
        await user.player.closePlayer().catch(() => {});
      }
    }
  );

  test(
    'PLR-05-11: playback can resume once the network is back after a drop',
    { tag: ['@interruption'] },
    async ({ user, page }) => {
      test.setTimeout(150000);
      await playThenCutNetwork(user, page);
      await page.waitForTimeout(20000);
      await page.unroute('**/*');
      try {
        const { paused } = await user.player.videoState();
        if (paused) await user.player.toggleVideoPlayback();
        const at = (await user.player.videoState()).currentTime;
        await expect
          .poll(async () => (await user.player.videoState()).currentTime, {
            message: 'the video plays on',
            timeout: 30000,
          })
          .toBeGreaterThan(at + 1);
      } finally {
        await user.player.closePlayer().catch(() => {});
      }
    }
  );

  test(
    'PLR-05-12: a video that cannot be played shows a message, not an endless spinner',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      test.setTimeout(120000);
      // The video file itself cannot be fetched (as for a missing or broken video); everything else loads.
      const broken = (route) =>
        route.request().resourceType() === 'media' || /\.(mp4|m3u8|webm|ts|mpd)(\?|$)/i.test(route.request().url())
          ? route.fulfill({ status: 404, body: '' })
          : route.continue();
      await page.route('**/*', broken);
      try {
        await expect(user.player.videoCards.first()).toBeAttached({ timeout: 10000 });
        await user.player.openResourceCard(user.player.videoCards);
        expect(await user.player.isPlayerOpen(), 'set-up: the video player opened').toBe(true);
        await user.player.toggleVideoPlayback().catch(() => {});
        await expect(
          page
            .getByText(
              /cannot be played|can't be played|could not|couldn't|unable to|not available|failed|error|try again/i
            )
            .filter({ visible: true })
            .first(),
          'a message says the video cannot be played'
        ).toBeVisible({ timeout: 45000 });
      } finally {
        await page.unroute('**/*', broken);
        await user.player.closePlayer().catch(() => {});
      }
    }
  );
});
