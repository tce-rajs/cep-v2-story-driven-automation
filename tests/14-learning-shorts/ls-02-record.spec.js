// LS-02 — Record a short
// Source: CEPV2_Stories/14_LearningShorts.md
// The client launches with a fake camera/microphone stream, so recording runs without a real device or prompt.

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'default' });

test.describe('LS-02 Record a short', () => {
  test.afterEach(async ({ app }) => {
    await app.learningShorts.closeAll();
  });

  test(
    'LS-02-01: Record starts a recording and shows that it is in progress',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const ls = user.learningShorts;
      await ls.openRecorder(user.magnet);
      await ls.recordStartBtn.click({ force: true });
      await expect(ls.recordStopBtn, 'Stop control shown while recording').toBeVisible({ timeout: 15000 });
      await expect(ls.recordStartBtn).toBeHidden();
    }
  );

  test(
    'LS-02-02: stopping the recording opens the composer with the recording attached',
    { tag: ['@functional'] },
    async ({ user }) => {
      const ls = user.learningShorts;
      await ls.openRecorder(user.magnet);
      await ls.record(4);
      // CONFIRMED LIVE (2026-09-26): the composer shows no attachment preview in this build; the recording is attached
      // implicitly (Save to Playlist stores it -- LS-04-01 plays it back). The composer opens ready to save.
      await expect(ls.titleInput).toBeVisible();
      expect((await ls.titleInput.inputValue()).trim().length, 'title pre-filled').toBeGreaterThan(3);
      await expect(ls.savePlaylistBtn).toBeEnabled();
      await expect(ls.saveRevisionBtn).toBeEnabled();
    }
  );

  test(
    'LS-02-03: starting and stopping several times quickly does not leave the recorder stuck',
    { tag: ['@edge', '@bug'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232): after one recording is discarded, pressing Record again
      // makes the recorder disappear without recording, and the next Magnet -> Learning Shorts shows the old composer
      // instead of the recorder. Seen with the client's fake camera/screen stream; worth re-checking by hand on a real device.
      test.fail(true, 'After one recording is discarded, the recorder cannot record again in the same session');
      const ls = user.learningShorts;
      for (let i = 0; i < 2; i++) {
        await ls.openRecorder(user.magnet);
        await ls.recordStartBtn.click({ force: true });
        await ls.recordStopBtn.waitFor({ state: 'visible', timeout: 15000 });
        await ls.recordStopBtn.click({ force: true });
        await expect(ls.titleInput).toBeVisible({ timeout: 30000 });
        await ls.discardBtn.click();
        await expect(ls.titleInput).toBeHidden({ timeout: 10000 });
      }
      await ls.openRecorder(user.magnet);
      await ls.record(3);
      await expect(ls.titleInput).toBeVisible();
    }
  );

  test(
    'LS-02-04: stopping straight after starting is either rejected clearly or saved as a playable video',
    { tag: ['@negative'] },
    async ({ user }) => {
      // INTERMITTENT PRODUCT DEFECT, SEEN LIVE (2026-09-26, v 0.0.232): in 1 of 2 runs the near-empty recording was saved
      // with no message as a 0-second video that cannot play. Left asserting the correct outcome, so it goes red when it recurs.
      const ls = user.learningShorts;
      await ls.openRecorder(user.magnet);
      await ls.recordStartBtn.click({ force: true });
      await ls.recordStopBtn.waitFor({ state: 'visible', timeout: 15000 });
      await ls.recordStopBtn.click({ force: true });
      await expect(ls.titleInput.or(ls.snackbar.first())).toBeVisible({ timeout: 30000 });
      if (!(await ls.isComposerOpen())) {
        await expect(ls.snackbar.first(), 'a clear message').toContainText(/\w{4,}/);
        return;
      }
      // Saved: it must play back as a real video, not a broken card.
      const title = `AutoTest tiny ${Date.now()}`;
      await ls.titleInput.fill(title);
      await ls.savePlaylistBtn.click();
      const card = user.playlist.resourceCards.filter({ hasText: title });
      await expect(card.first()).toBeAttached({ timeout: 30000 });
      await user.player.openResourceCard(card);
      const video = user.page.locator('video').filter({ visible: true }).first();
      await expect(video).toBeVisible({ timeout: 20000 });
      const duration = await video.evaluate(
        (v) =>
          new Promise((res) =>
            v.readyState >= 1
              ? res(v.duration)
              : v.addEventListener('loadedmetadata', () => res(v.duration), { once: true })
          )
      );
      expect(duration, 'a playable (non-empty) video').toBeGreaterThan(0);
      await user.player.closePlayer();
    }
  );

  test.fixme('LS-02-05: refusing camera/screen permission shows a clear message (manual-only: permission prompts are outside automation)', async () => {});
});
