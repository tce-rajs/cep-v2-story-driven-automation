// LS-05 — Saving and sending a short when the network fails
// Source: CEPV2_Stories/14_LearningShorts.md
// The network drops only for the app's own saving and sending calls (POST/PUT), at the moment Save or Send is pressed;
// the page itself stays loaded. Sending is real once the network is back (LS-05-04 sends one short to the first class,
// as LS-03-06 does); the failed attempts send nothing.

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'default' });

const isWrite = (req) => ['POST', 'PUT'].includes(req.method()) && ['fetch', 'xhr'].includes(req.resourceType());
const isSend = (req) => isWrite(req) && /send|share|short|revision|notify|screen/i.test(req.url());
const offline = (route) => (isWrite(route.request()) ? route.abort('internetdisconnected') : route.continue());
const failedMessage = (page) =>
  page
    .getByText(/not (sent|saved)|could not|couldn't|unable to|failed|error|no (internet|network|connection)|try again/i)
    .filter({ visible: true })
    .first();

test.describe('LS-05 Saving and sending a short when the network fails', () => {
  test.afterEach(async ({ app }) => {
    await app.page.unroute('**/*', offline).catch(() => {});
    await app.learningShorts.closeAll();
  });

  /** Open the send composer for a saved short, tick only the first class, and press Send with the network down. */
  const sendWhileOffline = async (user, page) => {
    const ls = user.learningShorts;
    const title = await ls.openSendComposer(user);
    const total = await ls.classOptions.count();
    for (let i = 0; i < total; i++)
      if (await ls.classCheckbox(i).isChecked()) await ls.classOption(i).click({ force: true });
    await ls.classOption(0).click({ force: true });
    await page.route('**/*', offline);
    await ls.sendBtn.click();
    await page.waitForTimeout(6000);
    return title;
  };

  test(
    'LS-05-01: a failed Send tells the teacher the short was not sent, with no success message',
    { tag: ['@interruption'] },
    async ({ user, page }) => {
      await sendWhileOffline(user, page);
      await expect(
        user.learningShorts.snackbar.filter({ hasText: /sent|success|shared/i }),
        'no success message'
      ).toHaveCount(0);
      await expect(failedMessage(page), 'the teacher is told it was not sent').toBeVisible({ timeout: 10000 });
    }
  );

  test(
    'LS-05-02: a failed Save to Playlist tells the teacher it was not saved, and no card appears in the Playlist',
    { tag: ['@interruption'] },
    async ({ user, page }) => {
      const ls = user.learningShorts;
      await ls.openRecorder(user.magnet);
      await ls.record(4);
      const title = `AutoTest offline save ${Date.now()}`;
      await ls.titleInput.fill(title);
      await page.route('**/*', offline);
      await ls.savePlaylistBtn.click();
      await expect(failedMessage(page), 'the teacher is told it was not saved').toBeVisible({ timeout: 15000 });
      await page.unroute('**/*', offline);
      await ls.closeAll();
      await page.reload();
      await expect(user.login.avatar).toBeVisible({ timeout: 30000 });
      await user.playlist.ensureDrawerVisible();
      await page.waitForTimeout(3000);
      expect(
        (await user.playlist.cardTitles()).filter((t) => t.includes(title)),
        'no card for the unsaved short'
      ).toEqual([]);
    }
  );

  test(
    'LS-05-03: after a failure the composer still has the title, the chosen classes and the recording',
    { tag: ['@interruption'] },
    async ({ user, page }) => {
      const ls = user.learningShorts;
      const title = await sendWhileOffline(user, page);
      await expect(ls.sendBtn, 'the composer is still open').toBeVisible();
      await expect(ls.titleInput, 'with the title').toHaveValue(title);
      expect(await ls.checkedClassCount(), 'with the chosen class').toBe(1);
      await expect(ls.classCheckbox(0), 'the first class still ticked').toBeChecked();
      // This composer sends the saved short (there is no attachment preview to check, see LS-04-02): the short
      // itself is still in the Playlist.
      expect(
        (await user.playlist.cardTitles()).some((t) => t.includes(title)),
        'the recording is still there'
      ).toBe(true);
    }
  );

  test(
    'LS-05-04: sending again once the network is back sends the short exactly once',
    { tag: ['@interruption'] },
    async ({ user, page }) => {
      const ls = user.learningShorts;
      await sendWhileOffline(user, page);
      await page.unroute('**/*', offline);
      const sends = [];
      page.on('response', (r) => {
        if (isSend(r.request()) && r.status() < 400) sends.push(r.url());
      });
      await expect(ls.sendBtn, 'set-up: the composer is still open').toBeVisible();
      await ls.sendBtn.click();
      await expect(ls.snackbar.first(), 'sent this time').toContainText(/sent|success|shared/i, { timeout: 30000 });
      await page.waitForTimeout(8000);
      expect(sends.length, `exactly one successful send (${sends.join(', ')})`).toBe(1);
    }
  );
});
