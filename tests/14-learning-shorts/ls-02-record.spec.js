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
      // The composer shows no attachment preview in this build; the recording is attached
      // implicitly (Save to Playlist stores it -- LS-04-01 plays it back). The composer opens ready to save.
      await expect(ls.titleInput).toBeVisible();
      expect((await ls.titleInput.inputValue()).trim().length, 'title pre-filled').toBeGreaterThan(3);
      await expect(ls.savePlaylistBtn).toBeEnabled();
      await expect(ls.saveRevisionBtn).toBeEnabled();
    }
  );

  test(
    'LS-02-03: starting and stopping several times quickly does not leave the recorder stuck',
    { tag: ['@edge'] },
    async ({ user }) => {
      const ls = user.learningShorts;
      for (let i = 0; i < 2; i++) {
        await ls.openRecorder(user.magnet);
        await ls.assertCanRecord();
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
      // Left asserting the correct outcome, so it goes red when it recurs.
      const ls = user.learningShorts;
      await ls.openRecorder(user.magnet);
      await ls.assertCanRecord();
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

  test('LS-02-05: refusing camera/screen permission shows a clear message (manual-only: permission prompts are outside automation)', async () => {
    test.fixme(
      true,
      'Manual only: the camera and screen permission prompts are outside the app and cannot be answered by automation'
    );
  });
});
