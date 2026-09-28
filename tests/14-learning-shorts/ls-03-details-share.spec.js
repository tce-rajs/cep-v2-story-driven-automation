// LS-03 — Complete the details and share
// Source: CEPV2_Stories/14_LearningShorts.md
// Save and Send are real actions (owner-approved 2026-09-26): saved shorts land in this topic's Playlist and sent
// shorts go to the ticked class. Every test starts from a fresh 4-second recording.

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'default' });

test.describe('LS-03 Complete the details and share', () => {
  test.beforeEach(async ({ user }) => {
    await user.learningShorts.openRecorder(user.magnet);
    await user.learningShorts.record(4);
  });

  test.afterEach(async ({ app }) => {
    await app.learningShorts.closeAll();
  });

  test(
    'LS-03-01: Save and Send are blocked while the title is empty and allowed with a title',
    { tag: ['@functional'] },
    async ({ user }) => {
      const ls = user.learningShorts;
      // Right after recording, the save actions are Save to Playlist and "Save & Send as Revision" (no plain Send).
      await ls.titleInput.fill('');
      await expect(ls.savePlaylistBtn, 'Save to Playlist blocked').toBeDisabled();
      await expect(ls.saveRevisionBtn, 'Save & Send blocked').toBeDisabled();
      await ls.titleInput.fill('Refraction recap');
      await expect(ls.savePlaylistBtn).toBeEnabled();
      await expect(ls.saveRevisionBtn).toBeEnabled();
    }
  );

  test.fixme('LS-03-02: Delete Attachment removes the video and Recapture attaches a new one', async () => {
    // STORY vs APP, CONFIRMED LIVE (2026-09-26, v 0.0.232): neither composer (after recording, or when sending a saved
    // short) has an attachment preview, a Delete Attachment or a Recapture control. The story came from the reference
    // suite (LS-ATT-01). Owner to decide: drop the case, or raise a product gap.
  });

  test(
    'LS-03-03: "Share with" lets the teacher pick one or more classes',
    { tag: ['@functional'] },
    async ({ user }) => {
      const ls = user.learningShorts;
      await ls.openSendComposer(user);
      const total = await ls.classOptions.count();
      expect(total, 'classes listed').toBeGreaterThan(0);
      for (let i = 0; i < total; i++)
        if (await ls.classCheckbox(i).isChecked()) await ls.classOption(i).click({ force: true });
      await ls.classOption(0).click({ force: true });
      expect(await ls.checkedClassCount(), 'one class picked').toBe(1);
      if (total > 1) {
        await ls.classOption(1).click({ force: true });
        expect(await ls.checkedClassCount(), 'more than one class can be picked').toBe(2);
      }
    }
  );

  test(
    'LS-03-04: Save to Playlist stores the short in the Playlist without sending it',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const ls = user.learningShorts;
      const title = `AutoTest short ${Date.now()}`;
      await ls.titleInput.fill(title);
      await ls.savePlaylistBtn.click();
      await expect(ls.titleInput, 'composer closes after saving').toBeHidden({ timeout: 30000 });
      await expect
        .poll(async () => (await user.playlist.cardTitles()).some((t) => t.includes(title)), {
          message: 'the saved short appears in the Playlist',
          timeout: 30000,
        })
        .toBe(true);
    }
  );

  test(
    'LS-03-05: Save Revision and Save to Playlist are separate actions that each confirm what they did',
    { tag: ['@functional'] },
    async ({ user }) => {
      const ls = user.learningShorts;
      await expect(ls.saveRevisionBtn).toBeVisible();
      await expect(ls.savePlaylistBtn).toBeVisible();
      await expect(ls.saveRevisionBtn).not.toHaveText(await ls.savePlaylistBtn.innerText());
      await ls.titleInput.fill(`AutoTest revision ${Date.now()}`);
      await ls.saveRevisionBtn.click();
      await expect(ls.snackbar.first(), 'Save Revision confirms what it did').toContainText(/revision|saved|success/i, {
        timeout: 30000,
      });
    }
  );

  test(
    'LS-03-06: Send delivers the short to the chosen class with a success message',
    { tag: ['@functional'] },
    async ({ user }) => {
      const ls = user.learningShorts;
      await ls.openSendComposer(user);
      const total = await ls.classOptions.count();
      for (let i = 0; i < total; i++)
        if (await ls.classCheckbox(i).isChecked()) await ls.classOption(i).click({ force: true });
      await ls.classOption(0).click({ force: true });
      await ls.sendBtn.click();
      await expect(ls.snackbar.first(), 'success message').toContainText(/sent|success|shared/i, { timeout: 30000 });
      await expect(ls.sendBtn).toBeHidden({ timeout: 30000 });
    }
  );

  test(
    'LS-03-07: a very long title with emoji does not break the composer or the class list',
    { tag: ['@edge'] },
    async ({ user }) => {
      const ls = user.learningShorts;
      await ls.openSendComposer(user);
      const before = await ls.titleInput.boundingBox();
      await ls.titleInput.fill('Light and optics revision 🔬✨📚 '.repeat(10));
      const after = await ls.titleInput.boundingBox();
      expect(after.width).toBeCloseTo(before.width, 0);
      await expect(ls.classOption(0), 'class list still in view').toBeInViewport();
      await expect(ls.sendBtn).toBeInViewport();
    }
  );

  test(
    'LS-03-08: clicking Save to Playlist and Save Revision in immediate succession triggers only one save (regression)',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const ls = user.learningShorts;
      const saves = [];
      page.on('request', (r) => {
        if (['POST', 'PUT'].includes(r.method()) && /short|screen|record|asset|revision/i.test(r.url()))
          saves.push(r.url());
      });
      await ls.titleInput.fill(`AutoTest race ${Date.now()}`);
      await Promise.all([ls.savePlaylistBtn.click({ force: true }), ls.saveRevisionBtn.click({ force: true })]);
      await page.waitForTimeout(8000);
      const saveCalls = saves.filter((u) => !/upload|presign|s3|blob/i.test(u));
      expect(saveCalls.length, `one save request (saw: ${saveCalls.join(', ')})`).toBeLessThanOrEqual(1);
    }
  );

  test(
    'LS-03-09: leaving the composer part-way through warns before discarding the work',
    { tag: ['@negative', '@bug'] },
    async ({ user, page }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232; the reference suite's LS-STATE-01): leaving the composer
      // with Back after editing the title closes it with no warning -- the recording is silently lost.
      test.fail(true, 'Leaving the Learning Shorts composer discards the recording without any warning');
      const ls = user.learningShorts;
      await ls.titleInput.fill('Half-finished short');
      await ls.hideKeyboard();
      // Seen on video (2026-09-26): an invisible switch (div.sr-switch__track) sits over Back and takes a real click, so
      // Back is pressed in the DOM to reach the behaviour this case is about.
      await ls.backBtn.evaluate((el) => el.click());
      const warning = page
        .locator('mat-dialog-container, [role="dialog"], [role="alertdialog"]')
        .filter({ hasText: /discard|unsaved|lose|are you sure/i });
      await expect(warning, 'a discard warning appears').toBeVisible({ timeout: 5000 });
    }
  );
});
