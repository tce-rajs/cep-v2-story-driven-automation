// PL-11 — Share a resource from its card
// Source: CEPV2_Stories/08_Playlist.md
// Cards of resources the teacher added carry a share icon (img.share-icon); built-in resources do not. Each test
// creates its own resource through Add Resource -> Create and removes it again. Nothing is actually shared
// (PL-11-04 really shares with another class, so it runs only with SHARE_REAL=1).

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'playlistGeneral' });

/** Create an own resource and return its card. */
const ownCard = async (user) => {
  const title = `AutoTest-share-${Date.now()}`;
  await user.addResource.createTextAsset(title);
  const card = user.playlist.resourceCards.filter({ hasText: title }).first();
  await expect(card, 'set-up: the own resource is in the Playlist').toBeVisible({ timeout: 20000 });
  // The Create form can leave the on-screen keyboard open over the strip: close it first.
  await user.page.keyboard.press('Escape');
  await user.header.calendar.click({ force: true });
  await user.page.waitForTimeout(800);
  return card;
};
const shareDialog = (page) =>
  page.locator('mat-dialog-container, [role=dialog], .cdk-overlay-pane').filter({ hasText: /share/i }).last();

test.describe('PL-11 Share a resource from its card', () => {
  test(
    'PL-11-01: a resource the teacher added shows the share icon on its card, and built-in resources do not',
    { tag: ['@functional'] },
    async ({ user }) => {
      const card = await ownCard(user);
      try {
        await expect(user.playlist.shareIconOf(card), 'own resource: share icon').toBeVisible();
        const builtIn = user.page.locator('[data-qa-id="playlist-resource-card"]');
        if (await builtIn.count())
          await expect(user.playlist.shareIconOf(builtIn.first()), 'built-in resource: no share icon').toHaveCount(0);
      } finally {
        await user.playlist.removeOwnedAsset(card).catch(() => {});
      }
    }
  );

  test(
    'PL-11-02: the share icon opens the share options (which classes to share with) without opening the resource',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const card = await ownCard(user);
      try {
        await user.playlist.shareIconOf(card).click({ force: true });
        await expect(shareDialog(page), 'the share options open').toBeVisible({ timeout: 10000 });
        expect(await user.player.isPlayerOpen(2000), 'the resource itself did not open').toBe(false);
        await page.keyboard.press('Escape');
      } finally {
        await user.playlist.removeOwnedAsset(card).catch(() => {});
      }
    }
  );

  test('PL-11-03: cancelling the share options shares nothing', { tag: ['@negative'] }, async ({ user, page }) => {
    const card = await ownCard(user);
    const shareRequests = [];
    page.on(
      'request',
      (r) => ['POST', 'PUT'].includes(r.method()) && /share/i.test(r.url()) && shareRequests.push(r.url())
    );
    try {
      await user.playlist.shareIconOf(card).click({ force: true });
      const dialog = shareDialog(page);
      await expect(dialog, 'set-up: the share options are open').toBeVisible({ timeout: 10000 });
      const cancel = dialog.getByRole('button', { name: /cancel|close|discard/i }).first();
      if (await cancel.count()) await cancel.click({ force: true });
      else await page.keyboard.press('Escape');
      await expect(dialog, 'the options closed').toBeHidden({ timeout: 5000 });
      await page.waitForTimeout(2000);
      expect(shareRequests, 'no share request was sent').toEqual([]);
    } finally {
      await user.playlist.removeOwnedAsset(card).catch(() => {});
    }
  });

  test(
    'PL-11-05: a resource created with Share off (RES-01-20) shows it as not shared',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const ar = user.addResource;
      // One resource with Share on (the default) and one with it off, so the two cards can be compared.
      const shared = await ownCard(user);
      const offTitle = `AutoTest-share-off-${Date.now()}`;
      try {
        await ar.openAction('create');
        await ar.createForm.waitFor({ state: 'visible', timeout: 10000 });
        await ar.shareToggleButton.click();
        await expect(ar.shareToggleButton, 'set-up: Share off').toHaveAttribute('aria-checked', 'false');
        await ar.titleInput.fill(offTitle);
        await ar.fileInput.setInputFiles({ name: 'share-off.txt', mimeType: 'text/plain', buffer: Buffer.from('off') });
        await ar.submitBtn.click();
        const off = user.playlist.resourceCards.filter({ hasText: offTitle }).first();
        await expect(off, 'set-up: the Share-off resource is in the Playlist').toBeVisible({ timeout: 20000 });
        await page.keyboard.press('Escape');
        const look = (card) =>
          card.evaluate((el) => {
            const icon = el.querySelector('img.share-icon');
            return icon ? `${icon.getAttribute('src')}|${icon.className}|${icon.getAttribute('alt') || ''}` : 'no icon';
          });
        const sharedLook = await look(shared);
        const offLook = await look(off);
        test.info().annotations.push({ type: 'note', description: `Shared: ${sharedLook} / Share off: ${offLook}` });
        expect(offLook, 'the Share-off card does not look like a shared one').not.toBe(sharedLook);
      } finally {
        await user.playlist.removeOwnedAsset(shared).catch(() => {});
        const off = user.playlist.resourceCards.filter({ hasText: offTitle });
        if (await off.count()) await user.playlist.removeOwnedAsset(off).catch(() => {});
      }
    }
  );

  test(
    "PL-11-04: a resource shared with another class appears in that class's Playlist",
    { tag: ['@functional'] },
    async ({ user, page }) => {
      test.setTimeout(240000);
      const title = `AutoTest-share-class-${Date.now()}`;
      await user.addResource.createTextAsset(title);
      const card = user.playlist.resourceCards.filter({ hasText: title }).first();
      await expect(card, 'set-up: the own resource is in the Playlist').toBeVisible({ timeout: 20000 });
      await page.keyboard.press('Escape');
      await user.header.calendar.click({ force: true });
      const here = (await user.nav.currentClassBtn.innerText()).replace(/\s+/g, ' ').trim();
      let target = null;
      try {
        await user.playlist.shareIconOf(card).click({ force: true });
        const dialog = shareDialog(page);
        await expect(dialog, 'set-up: the share options are open').toBeVisible({ timeout: 10000 });
        // Another class of the same subject: its option reads like "12 B" / "Class 12 B".
        const options = dialog.locator('mat-checkbox, label').filter({ hasText: /\d+\s*[- ]?\s*[A-Z]\b/ });
        for (let i = 0; i < (await options.count()) && !target; i++) {
          const text = (await options.nth(i).innerText()).replace(/\s+/g, ' ').trim();
          const m = text.match(/(\d+)\s*[- ]?\s*([A-Z])\b/);
          // The class bar reads like "Class 12A | Physics".
          if (m && !new RegExp(`\\b${m[1]}\\s*${m[2]}\\b`).test(here.split('|')[0])) {
            target = { grade: `Class ${m[1]}`, division: m[2], option: options.nth(i) };
          }
        }
        if (!target) throw new Error('DATA MISSING ON THIS SERVER: the share options offer no other class');
        await target.option.click({ force: true });
        test.skip(!process.env.SHARE_REAL, 'sharing really sends the resource to another class: run with SHARE_REAL=1');
        await dialog
          .getByRole('button', { name: /^\s*(share|send)\b/i })
          .last()
          .click();
        await expect(dialog, 'the share is sent').toBeHidden({ timeout: 15000 });
        // That class, same subject and topic.
        const subject = here.split('|').pop().trim();
        await user.nav.resetToClass(target.grade, target.division, subject);
        await user.nav.goToChapterTopic(0, 0);
        await user.playlist.ensureDrawerVisible();
        const there = user.playlist.resourceCards.filter({ hasText: title });
        await expect(there, `the resource is in ${target.grade} ${target.division} ${subject}'s Playlist`).toHaveCount(
          1,
          {
            timeout: 30000,
          }
        );
        await user.playlist.removeOwnedAsset(there.first()).catch(() => {});
      } finally {
        await page.keyboard.press('Escape').catch(() => {});
        await user.nav.applyClassMap('playlistGeneral').catch(() => {});
        await user.playlist.ensureDrawerVisible().catch(() => {});
        const mine = user.playlist.resourceCards.filter({ hasText: title });
        if (await mine.count().catch(() => 0)) await user.playlist.removeOwnedAsset(mine.first()).catch(() => {});
      }
    }
  );

  test('PL-11-06: a resource that is not mine shows no share icon', { tag: ['@negative'] }, async ({ user }) => {
    // Built-in (curriculum) resources belong to no teacher: none of them may offer Share.
    const builtIn = user.page.locator('[data-qa-id="playlist-resource-card"], [data-qa-id="playlist-quiz-card"]');
    await expect(builtIn.first(), 'set-up: built-in resources in this topic').toBeAttached({ timeout: 15000 });
    const withIcon = await builtIn.evaluateAll((els) =>
      els
        .filter((el) => el.querySelector('img.share-icon'))
        .map((el) => (el.innerText || '').replace(/\s+/g, ' ').trim())
    );
    expect(withIcon, 'no built-in resource shows a share icon').toEqual([]);
  });
});
