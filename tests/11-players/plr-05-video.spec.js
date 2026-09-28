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
    // isPlayerOpen()/toBeAttached() only prove the close icon and video element exist — not that it occupies a
    // real amount of screen. CONFIRMED LIVE: a correctly-opened video element is ~300x185 in this window.
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

  // --- Added 2026-09-26 (gap-fill from the reference suite's Players workbook and Zoho bugs) ---

  test('PLR-05-05: seeking and volume work', { tag: ['@functional'] }, async ({ user }) => {
    await openVideo(user);
    const v = user.player.videoElement;
    const duration = (await user.player.videoState()).duration;
    await v.evaluate((el, t) => (el.currentTime = t), duration / 2);
    await expect
      .poll(async () => Math.round((await user.player.videoState()).currentTime), { message: 'seeked to the middle' })
      .toBeGreaterThanOrEqual(Math.floor(duration / 2) - 1);
    await v.evaluate((el) => (el.volume = 0.3));
    expect(await v.evaluate((el) => el.volume)).toBeCloseTo(0.3, 1);
    await v.evaluate((el) => (el.muted = true));
    expect(await v.evaluate((el) => el.muted)).toBe(true);
    await user.player.closePlayer();
  });

  test(
    'PLR-05-06: the teacher can annotate over a playing video (regression, Zoho TCN-I15547)',
    { tag: ['@bug', '@regression'] },
    async ({ user, page }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232; Zoho TCN-I15547): the video plays in an iframe above the
      // whiteboard drawing layer, so a Pen stroke over a playing video is not drawn at all.
      test.fail(true, 'Pen strokes over a playing video are not drawn');
      await openVideo(user);
      await user.player.toggleVideoPlayback();
      const paths = () => page.locator('svg path').count();
      const before = await paths();
      await user.toolbar.selectTool('gtPen');
      const box = await user.player.videoElement.boundingBox();
      await page.mouse.move(box.x + 30, box.y + 30);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width - 30, box.y + box.height - 30, { steps: 15 });
      await page.mouse.up();
      await expect.poll(paths, { message: 'a stroke was drawn over the video' }).toBeGreaterThan(before);
      await user.player.closePlayer();
    }
  );

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
});
