// Phase 1 exploration — FLOW-18 Learning Shorts, end to end, in the desktop client. Not part of any suite.
// Records a short while writing in fresh board space, saves it to the Playlist, plays it back and removes it again.
// Never sends (nothing reaches students). Evidence: report/exploration/flow-18/.
const fs = require('fs');
const path = require('path');
const { test } = require('../../fixtures');
const { layoutHandwriting } = require('../../pages/lib/handwriting');

const OUT = path.join(__dirname, '..', '..', 'report', 'exploration', 'flow-18');
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const note = (step, data) => {
  log.push({ step, ...data });
  fs.writeFileSync(path.join(OUT, 'log.json'), JSON.stringify(log, null, 2));
};

test.use({ classMap: 'default', freshSpace: true });
test.setTimeout(15 * 60 * 1000);

test('explore FLOW-18 Learning Shorts', async ({ user, page }) => {
  const ls = user.learningShorts;
  const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(() => {});
  const step = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      note(name, { error: e.message.split('\n')[0] });
      await shot(`${name}-error`);
    }
  };
  const visibleIds = (prefix) =>
    page.evaluate(
      (p) =>
        [...document.querySelectorAll(`[data-qa-id^="${p}"]`)]
          .filter((e) => e.getBoundingClientRect().width > 0)
          .map((e) => `${e.getAttribute('data-qa-id')}|${(e.innerText || e.value || '').trim().slice(0, 50)}`),
      prefix
    );
  const title = `Explore short ${Date.now()}`;
  let saved = false;

  await step('A-environment', async () => {
    note('A-environment', {
      url: page.url(),
      secureContext: await page.evaluate(() => window.isSecureContext),
      mediaDevices: await page.evaluate(() => !!navigator.mediaDevices),
      displayMedia: await page.evaluate(() => !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)),
    });
  });

  await step('B-record', async () => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await ls.openRecorder(user.magnet);
    await shot('B-recorder');
    await ls.recordStartBtn.click({ force: true });
    const started = await ls.recordStopBtn.waitFor({ state: 'visible', timeout: 15000 }).then(
      () => true,
      () => false
    );
    await shot('B-recording');
    if (started) {
      // The teacher explains on the board while recording.
      const pages = layoutHandwriting(
        'water boils at hundred degrees',
        { x: 300, y: 300, width: 500, height: 90 },
        {
          xHeight: 18,
          seed: 9,
        }
      );
      await user.content.writeHandwriting(pages);
      await page.waitForTimeout(4000);
      await ls.recordStopBtn.click({ force: true });
    }
    const composer = await ls.titleInput.waitFor({ state: 'visible', timeout: 30000 }).then(
      () => true,
      () => false
    );
    await shot('B-composer');
    note('B-record', {
      started,
      composer,
      pageErrors: errors.slice(0, 5),
      prefilledTitle: composer ? await ls.titleInput.inputValue() : null,
      controls: await visibleIds('learning-shorts-'),
    });
  });

  await step('C-save-playlist', async () => {
    if (!(await ls.isComposerOpen())) return note('C-save-playlist', { skipped: 'no composer' });
    await ls.titleInput.fill(title);
    await ls.hideKeyboard();
    await ls.savePlaylistBtn.click();
    await page.waitForTimeout(3000);
    await shot('C-after-save');
    const card = user.playlist.resourceCards.filter({ hasText: title }).first();
    saved = await card.waitFor({ state: 'attached', timeout: 30000 }).then(
      () => true,
      () => false
    );
    note('C-save-playlist', {
      message: await ls.snackbar.allInnerTexts().catch(() => []),
      cardInPlaylist: saved,
    });
  });

  await step('D-play', async () => {
    if (!saved) return note('D-play', { skipped: 'not saved' });
    await user.playlist.ensureDrawerVisible();
    const card = user.playlist.resourceCards.filter({ hasText: title }).first();
    await card.click({ force: true });
    await page.waitForTimeout(6000);
    await shot('D-player');
    const video = await page.evaluate(() => {
      const v = [...document.querySelectorAll('video')].find((e) => e.getBoundingClientRect().width > 0);
      return v ? { duration: v.duration, paused: v.paused, w: v.videoWidth, h: v.videoHeight, src: !!v.src } : null;
    });
    note('D-play', { video });
    await page.keyboard.press('Escape');
    await user.player.closePlayer().catch(() => {});
  });

  await step('E-reload-kept', async () => {
    if (!saved) return;
    await page.reload();
    await page.waitForTimeout(8000);
    await user.playlist.ensureDrawerVisible();
    note('E-reload-kept', {
      cardAfterReload: await user.playlist.resourceCards
        .filter({ hasText: title })
        .count()
        .catch(() => 0),
    });
  });

  await step('F-remove', async () => {
    if (!saved) return;
    const card = user.playlist.resourceCards.filter({ hasText: title }).first();
    await user.playlist.removeOwnedAsset(card);
    await page.waitForTimeout(3000);
    note('F-remove', {
      left: await user.playlist.resourceCards
        .filter({ hasText: title })
        .count()
        .catch(() => 0),
    });
  });

  await ls.closeAll().catch(() => {});
});
