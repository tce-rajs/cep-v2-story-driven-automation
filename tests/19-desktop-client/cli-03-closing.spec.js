// CLI-03 — Closing the client
// Source: CEPV2_Stories/19_DesktopClient.md
// Desktop client only. Each test closes the worker's client the way a teacher does (the window's close) and starts it
// again; a fresh start is signed out by design (LOG-01-14). The upload of CLI-03-03 is held back so it is still under
// way when the client closes; anything it leaves is removed. The notice of CLI-03-04 is never sent. Writing: fresh
// space only, nothing erased. CLI-03-01 (closing in the autosave countdown) is an improvement.

const { test, expect } = require('../../fixtures');
const { clientApp, uniqueCopy } = require('../00-flows/flow-helpers');
const { restartClient, signInToBoard } = require('../18-resilience/resilience-lib');
const { pinForModule } = require('../../config/moduleClassMap');

test.describe('CLI-03 Closing the client', () => {
  test.skip(!!process.env.RUN_IN_BROWSER, 'closing the desktop client has no browser equivalent');
  test.describe.configure({ timeout: 300000 });

  test(
    'CLI-03-02: reopening after a close starts signed out, on Guest Mode',
    { tag: ['@functional'] },
    async ({ workerApp }) => {
      let app = await clientApp(workerApp);
      await app.signIn();
      await expect(app.login.avatar, 'set-up: signed in').toBeVisible();
      app = await restartClient(workerApp);
      await expect(app.login.guestModeText, 'Guest Mode').toBeVisible({ timeout: 20000 });
      await expect(app.login.avatar, 'signed out').toBeHidden();
    }
  );

  test(
    'CLI-03-03: closing during an upload leaves no half-created resource',
    { tag: ['@interruption'] },
    async ({ workerApp }) => {
      let app = await clientApp(workerApp);
      await signInToBoard(app, 'default');
      await app.playlist.ensureDrawerVisible();
      const title = `AutoTest-close-upload-${Date.now()}`;
      // The upload (a POST with a body over 1 MB) is held back, so it is still going when the client closes.
      let held = 0;
      await app.page.route('**/*', async (route) => {
        const r = route.request();
        if (r.method() === 'POST' && (r.postDataBuffer() || Buffer.alloc(0)).length > 1e6) {
          held++;
          await new Promise((resolve) => setTimeout(resolve, 60000));
        }
        return route.continue().catch(() => {});
      });
      const ar = app.addResource;
      await ar.openAction('create');
      await ar.createForm.waitFor({ state: 'visible', timeout: 10000 });
      await ar.titleInput.fill(title);
      await ar.fileInput.setInputFiles(uniqueCopy('positive/near-limit-9.6MB.mp4'));
      await ar.submitBtn.click();
      await expect.poll(() => held, { message: 'set-up: the upload is under way', timeout: 30000 }).toBeGreaterThan(0);
      app = await restartClient(workerApp);
      await signInToBoard(app, 'default');
      await app.playlist.ensureDrawerVisible();
      const card = app.playlist.resourceCards.filter({ hasText: title });
      try {
        await expect(card, 'no half-created resource in the Playlist').toHaveCount(0, { timeout: 15000 });
      } finally {
        if (await card.count()) await app.playlist.removeOwnedAsset(card.first()).catch(() => {});
      }
    }
  );

  test(
    'CLI-03-04: closing with a video playing and a notice composer open, the next start is clean and usable',
    { tag: ['@interruption'] },
    async ({ workerApp }) => {
      let app = await clientApp(workerApp);
      await app.signIn(pinForModule('playersDefault'));
      await app.nav.applyClassMap('playersDefault');
      await app.content.startOnFreshSpace();
      await app.aiNotices.openComposer(app, 'Science fair tomorrow');
      await expect(app.aiNotices.titleInput, 'set-up: the notice composer is open').toBeVisible();
      await app.playlist.ensureDrawerVisible();
      await app.player.openResourceCard(app.player.videoCards);
      expect(await app.player.isPlayerOpen(20000), 'set-up: the video is open').toBe(true);
      await app.player.toggleVideoPlayback().catch(() => {});
      app = await restartClient(workerApp);
      await expect(app.login.guestModeText, 'the next start is clean: Guest Mode').toBeVisible({ timeout: 20000 });
      await expect(app.aiNotices.titleInput, 'no notice composer left open').toBeHidden();
      expect(await app.player.isPlayerOpen(3000), 'no player left open').toBe(false);
      await signInToBoard(app, 'default');
      await app.content.startOnFreshSpace();
      const before = await app.toolbar.pathCount();
      await app.toolbar.penStroke({ x: 520, y: 420 }, { x: 760, y: 480 });
      expect(await app.toolbar.pathCount(), 'and usable: the pen writes').toBe(before + 1);
    }
  );
});
