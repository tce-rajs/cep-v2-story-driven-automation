// FLOW-18 — Learning Shorts from recording to sharing
// Source: CEPV2_Stories/00_EndToEndFlows.md
// Data: the default class (Class 9A Science 4.1). The recorder records the board (the client runs with a stand-in
// camera and microphone). On a server served over plain http the client gets no screen capture, and every recording
// is lost (finding S1): LearningShortsPage.record() reports that as a product failure. FLOW-18-03 really sends ONE
// short to the class the teacher is in, as LS-03-06 already does. Every short saved to the Playlist is removed again.
// FLOW-18-08 (received in Crystal) is a hand-off.

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'default' });

/** Record a short and save it to the Playlist under a unique title; returns the title. */
const saveShort = async (user) => {
  const ls = user.learningShorts;
  const title = `AutoTest short ${Date.now()}`;
  await ls.openRecorder(user.magnet);
  await ls.record(4);
  await ls.titleInput.fill(title);
  await ls.hideKeyboard();
  await ls.savePlaylistBtn.click();
  await expect(ls.titleInput, 'set-up: the short is saved').toBeHidden({ timeout: 30000 });
  return title;
};
const removeShort = async (user, title) => {
  if (!title) return;
  await user.player.closePlayer().catch(() => {});
  await user.learningShorts.closeAll().catch(() => {});
  await user.playlist.ensureDrawerVisible().catch(() => {});
  const card = user.playlist.resourceCards.filter({ hasText: title });
  if (await card.count().catch(() => 0)) await user.playlist.removeOwnedAsset(card).catch(() => {});
};
const isSave = (req) =>
  ['POST', 'PUT'].includes(req.method()) && /short|video|upload|asset|content\/file/i.test(req.url());

test.describe('FLOW-18 Learning Shorts from recording to sharing', () => {
  test.describe.configure({ timeout: 240000 });

  test.afterEach(async ({ app }) => {
    await app.page.unroute('**/*').catch(() => {});
    await app.player.closePlayer().catch(() => {});
    await app.learningShorts.closeAll();
  });

  test('FLOW-18-01: the recorder opens and starts recording', { tag: ['@smoke', '@functional'] }, async ({ user }) => {
    const ls = user.learningShorts;
    await ls.openRecorder(user.magnet);
    await expect(ls.recordStartBtn, 'the recorder opens').toBeVisible();
    await ls.assertCanRecord();
    await ls.recordStartBtn.click({ force: true });
    await expect(ls.recordStopBtn, 'it is recording').toBeVisible({ timeout: 15000 });
  });

  test('FLOW-18-02: stopping shows a preview of the recording', { tag: ['@functional'] }, async ({ user }) => {
    const ls = user.learningShorts;
    await ls.openRecorder(user.magnet);
    await ls.record(4);
    const preview = user.page.locator('video').filter({ visible: true }).first();
    await expect(preview, 'a preview of the recording').toBeVisible({ timeout: 15000 });
    await expect
      .poll(() => preview.evaluate((v) => v.duration || 0), { message: 'the preview holds the recording' })
      .toBeGreaterThan(1);
  });

  test(
    'FLOW-18-03: title and details can be filled in and the short shared',
    { tag: ['@functional'] },
    async ({ user }) => {
      const ls = user.learningShorts;
      let title;
      try {
        title = await ls.openSendComposer(user);
        await expect(ls.titleInput, 'the title can be filled in').toHaveValue(title);
        const mine = (await user.whiteboard.currentClassBtn.innerText())
          .match(/Class\s*\d+\s*[A-Z]/i)[0]
          .replace(/\s+/g, '');
        const labels = (await ls.classOptions.allInnerTexts()).map((t) => t.replace(/\s+/g, ''));
        const index = labels.findIndex((t) => t.toLowerCase() === mine.toLowerCase());
        expect(index, 'set-up: the current class is offered').toBeGreaterThanOrEqual(0);
        for (let i = 0; i < labels.length; i++)
          if ((await ls.classCheckbox(i).isChecked()) !== (i === index)) await ls.classOption(i).click({ force: true });
        await ls.hideKeyboard();
        await ls.sendBtn.click();
        await expect(ls.snackbar.first(), 'the short is shared').toContainText(/sent|success|shared/i, {
          timeout: 30000,
        });
      } finally {
        await user.playlist.finishEditing().catch(() => {});
        await removeShort(user, title);
      }
    }
  );

  test('FLOW-18-04: the shared short is listed and plays', { tag: ['@functional'] }, async ({ user }) => {
    let title;
    try {
      title = await saveShort(user);
      const card = user.playlist.resourceCards.filter({ hasText: title });
      await expect(card.first(), 'the short is listed').toBeAttached({ timeout: 30000 });
      await user.player.openResourceCard(card);
      const video = user.page.locator('video').filter({ visible: true }).first();
      await expect(video, 'it opens').toBeVisible({ timeout: 20000 });
      await video.evaluate((v) => v.play().catch(() => {}));
      await expect
        .poll(() => video.evaluate((v) => v.currentTime), { message: 'it plays', timeout: 15000 })
        .toBeGreaterThan(0.3);
    } finally {
      await removeShort(user, title);
    }
  });

  test('FLOW-18-05: a short can be reused in a lesson', { tag: ['@functional'] }, async ({ user, page }) => {
    let title;
    try {
      title = await saveShort(user);
      // Reused: still in the lesson's Playlist the next time the teacher comes to it.
      await page.reload();
      await user.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
      await user.playlist.ensureDrawerVisible();
      const card = user.playlist.resourceCards.filter({ hasText: title });
      await expect(card.first(), 'the short is in the lesson after a reload').toBeAttached({ timeout: 30000 });
      await user.player.openResourceCard(card);
      expect(await user.player.isPlayerOpen(20000), 'and opens in the lesson').toBe(true);
    } finally {
      await removeShort(user, title);
    }
  });

  test(
    'FLOW-18-06: leaving the recorder without saving asks before discarding',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const ls = user.learningShorts;
      await ls.openRecorder(user.magnet);
      await ls.record(4);
      await ls.hideKeyboard();
      await ls.closeBtn.click({ force: true });
      await expect(
        page
          .locator('mat-dialog-container, [role="dialog"]')
          .filter({ hasText: /discard|lose|unsaved|are you sure/i })
          .first(),
        'it asks before discarding the recording'
      ).toBeVisible({ timeout: 5000 });
    }
  );

  test(
    'FLOW-18-07: a network failure while sharing keeps the recording',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const ls = user.learningShorts;
      await ls.openRecorder(user.magnet);
      await ls.record(4);
      const title = `AutoTest failed save ${Date.now()}`;
      await ls.titleInput.fill(title);
      await ls.hideKeyboard();
      await page.route('**/*', (route) =>
        isSave(route.request()) ? route.abort('internetdisconnected') : route.continue()
      );
      try {
        await ls.savePlaylistBtn.click();
        await expect(
          page.getByText(/fail|error|could not|couldn.t|unable|try again|network|offline/i).first(),
          'a message that it was not saved'
        ).toBeVisible({ timeout: 20000 });
        await expect(ls.titleInput, 'the composer is still open').toHaveValue(title);
        await expect(page.locator('video').filter({ visible: true }).first(), 'with the recording').toBeVisible();
      } finally {
        await page.unroute('**/*').catch(() => {});
        await removeShort(user, title);
      }
    }
  );

  test(
    'FLOW-18-09: when recording is not possible, the teacher is told before recording, not after',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const canRecord = await page.evaluate(() => window.isSecureContext && !!navigator.mediaDevices);
      test.skip(canRecord, 'recording is possible on this server, so there is nothing to tell the teacher');
      await user.learningShorts.openRecorder(user.magnet);
      await expect(
        page
          .getByText(
            /cannot record|can.t record|recording (is )?not (available|possible|supported)|screen capture|permission|secure/i
          )
          .first(),
        'the recorder says recording is not possible before Record is pressed'
      ).toBeVisible({ timeout: 10000 });
    }
  );
});
