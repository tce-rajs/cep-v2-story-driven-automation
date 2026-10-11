// PL-09 — Manage resources in the Playlist
// Source: CEPV2_Stories/08_Playlist.md
// Tests add their own text asset through Add Resource -> Create (addResource.createTextAsset) and remove it again,
// so the shared topic is left as found.

const { test, expect } = require('../../fixtures');

test.describe('PL-09 Manage resources in the Playlist', () => {
  test.use({ classMap: 'playersDefault' });

  const addOwned = async (user) => {
    const title = `AutoTest-${Date.now()}`;
    await user.addResource.createTextAsset(title);
    const card = user.playlist.resourceCards.filter({ hasText: title });
    await expect(card).toBeVisible({ timeout: 15000 });
    return { title, card };
  };

  test(
    'PL-09-01: removing a resource asks for confirmation before it disappears',
    { tag: ['@functional'] },
    async ({ user }) => {
      const pl = user.playlist;
      const { card } = await addOwned(user);
      await pl.enterEditMode();
      await card.first().hover();
      await card.first().locator('[data-qa-id="playlist-asset-overflow-icon-btn"]').click();
      await pl.assetRemoveBtn.first().click();
      await expect(pl.assetRemoveConfirmBtn.first(), 'confirmation asked').toBeVisible({ timeout: 5000 });
      await expect(card, 'still there until confirmed').toBeVisible();
      await pl.assetRemoveConfirmBtn.first().click();
      await expect(card).toHaveCount(0, { timeout: 10000 });
      // Removing an asset from its menu already leaves Edit mode (see PlaylistPage.removeOwnedAsset).
      await pl.finishEditingBtn.click({ timeout: 3000 }).catch(() => {});
    }
  );

  test(
    'PL-09-02: a new order made by dragging cards is kept after the app reloads',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const pl = user.playlist;
      const { card, title } = await addOwned(user);
      try {
        await pl.enterEditMode();
        const order = await pl.cardTitles();
        // Cards are Angular CDK drag items (enabled only in Edit mode). The new card is last, often scrolled out of the
        // strip, so bring it into view and drag it gently onto the card to its left.
        await card.first().scrollIntoViewIfNeeded();
        const from = await card.first().boundingBox();
        const index = order.findIndex((t) => t.includes(title));
        const target = await pl.resourceCards.nth(Math.max(0, index - 2)).boundingBox();
        await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
        await page.mouse.down();
        await page.mouse.move(from.x + from.width / 2 - 8, from.y + from.height / 2, { steps: 4 });
        await page.waitForTimeout(300);
        await page.mouse.move(target.x + target.width / 3, target.y + target.height / 2, { steps: 30 });
        await page.waitForTimeout(500);
        await page.mouse.up();
        await page.waitForTimeout(1500);
        await pl.finishEditing();
        const moved = await pl.cardTitles();
        expect(
          moved.findIndex((t) => t.includes(title)),
          'the card moved to the front'
        ).toBeLessThan(order.findIndex((t) => t.includes(title)));
        await page.reload();
        await expect(user.login.avatar).toBeVisible({ timeout: 30000 });
        await pl.ensureDrawerVisible();
        await expect.poll(() => pl.cardTitles(), { message: 'order kept after reload', timeout: 20000 }).toEqual(moved);
      } finally {
        await pl.removeOwnedAsset(pl.resourceCards.filter({ hasText: title })).catch(() => {});
      }
    }
  );

  test(
    "PL-09-03: Edit in a card's menu appears only on resources the teacher created",
    { tag: ['@functional'] },
    async ({ user }) => {
      const pl = user.playlist;
      const { card, title } = await addOwned(user);
      try {
        await pl.enterEditMode();
        await card.first().scrollIntoViewIfNeeded();
        await card.first().hover();
        // A card's overflow menu exists only in Edit mode, and only on the teacher's own assets.
        await card.first().locator('[data-qa-id="playlist-asset-overflow-icon-btn"]').click({ force: true });
        await expect(
          user.page.locator('[data-qa-id="playlist-asset-edit-btn"]').filter({ visible: true }),
          'Edit offered on an own resource'
        ).toBeVisible();
        await user.page.keyboard.press('Escape');
        // A curriculum resource card (playlist-resource-card) has no overflow menu at all, so no Edit, even in Edit mode.
        const curriculum = user.page.locator('[data-qa-id="playlist-resource-card"]').first();
        await curriculum.hover();
        await expect(
          curriculum.locator('[data-qa-id="playlist-asset-overflow-icon-btn"]'),
          'no menu on a curriculum resource'
        ).toHaveCount(0);
        await expect(
          curriculum.locator('[data-qa-id="playlist-asset-edit-btn"]'),
          'no Edit on a curriculum resource'
        ).toHaveCount(0);
        await pl.finishEditing().catch(() => {});
      } finally {
        await pl.removeOwnedAsset(pl.resourceCards.filter({ hasText: title })).catch(() => {});
      }
    }
  );

  test(
    'PL-09-04: saving changes to a teacher-created resource shows the right success message',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const pl = user.playlist;
      const { card, title } = await addOwned(user);
      try {
        await pl.enterEditMode();
        await card.first().scrollIntoViewIfNeeded();
        await card.first().hover();
        // A card's overflow menu exists only in Edit mode, and only on the teacher's own assets.
        await card.first().locator('[data-qa-id="playlist-asset-overflow-icon-btn"]').click({ force: true });
        await page.locator('[data-qa-id="playlist-asset-edit-btn"]').filter({ visible: true }).first().click();
        const titleInput = user.addResource.titleInput;
        await titleInput.fill(`${title}-edited`);
        await user.addResource.submitBtn.click();
        const toast = page
          .locator('mat-snack-bar-container, .mat-mdc-snack-bar-container, .toast-container, [role="alert"]')
          .first();
        await expect(toast).toBeVisible({ timeout: 15000 });
        await expect(toast, 'says the resource was updated').toContainText(/updated/i);
        await expect(toast, 'not a "created"/"added" message').not.toContainText(/created|added/i);
      } finally {
        await pl.removeOwnedAsset(pl.resourceCards.filter({ hasText: title })).catch(() => {});
      }
    }
  );

  test(
    "PL-09-05: adding a resource that's already in the Playlist doesn't create a confusing duplicate",
    { tag: ['@edge'] },
    async ({ user, page }) => {
      // The Library's suggestions for this topic are resources its Playlist already holds.
      await user.nav.applyClassMap('librarySuggestions');
      await user.playlist.ensureDrawerVisible();
      const before = await user.playlist.cardTitles();
      await user.addResource.openAction('library');
      await expect(user.addResource.libraryResults.first()).toBeVisible({ timeout: 20000 });
      const title = (await user.addResource.libraryResults.first().innerText())
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)[0];
      expect(
        before.some((t) => t.toLowerCase().includes(title.toLowerCase())),
        `"${title}" is already in the Playlist`
      ).toBe(true);
      await user.addResource.libraryResults.first().click({ force: true });
      const add = user.addResource.libraryPdfAddToPlaylistBtn
        .or(page.getByRole('button', { name: /add to playlist/i }))
        .filter({ visible: true })
        .first();
      await add.click();
      await page.waitForTimeout(3000);
      await user.addResource.libraryCloseBtn.click({ force: true }).catch(() => {});
      const after = await user.playlist.cardTitles();
      const copies = after.filter((t) => t.toLowerCase().includes(title.toLowerCase())).length;
      expect(copies, 'still listed once').toBe(
        before.filter((t) => t.toLowerCase().includes(title.toLowerCase())).length
      );
      expect(after, 'no extra card').toHaveLength(before.length);
    }
  );

  test(
    'PL-09-06: removing a resource while the network is down shows a message, and the card is still there after a reload',
    { tag: ['@interruption'] },
    async ({ user, page }) => {
      const title = `AutoTest-offline-${Date.now()}`;
      await user.addResource.createTextAsset(title);
      const card = () => user.playlist.resourceCards.filter({ hasText: title });
      await expect(card(), 'set-up: the resource is in the Playlist').toHaveCount(1, { timeout: 20000 });
      await page.keyboard.press('Escape');
      await page.route('**/*', (route) => route.abort('internetdisconnected'));
      try {
        await user.playlist.removeOwnedAsset(card().first()).catch(() => {});
        await expect(
          page
            .getByText(/fail|error|could not|couldn.t|unable|try again|network|offline/i)
            .filter({ visible: true })
            .first(),
          'a message says it was not removed'
        ).toBeVisible({ timeout: 10000 });
      } finally {
        await page.unroute('**/*');
      }
      await page.reload();
      await user.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
      await user.playlist.ensureDrawerVisible();
      try {
        await expect(card(), 'the resource is still there').toHaveCount(1, { timeout: 15000 });
      } finally {
        if (await card().count()) await user.playlist.removeOwnedAsset(card().first()).catch(() => {});
      }
    }
  );

  test(
    'PL-09-08: cancelling Remove keeps the resource in the Playlist',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const pl = user.playlist;
      const { card, title } = await addOwned(user);
      try {
        await pl.enterEditMode();
        await card.first().hover();
        await card.first().locator('[data-qa-id="playlist-asset-overflow-icon-btn"]').click();
        await pl.assetRemoveBtn.first().click();
        await expect(pl.assetRemoveConfirmBtn.first(), 'set-up: the confirmation is asked').toBeVisible({
          timeout: 5000,
        });
        const cancel = pl.resourceRemoveCancelBtn
          .or(page.locator('[data-qa-id*="remove-cancel"]:visible, [data-qa-id*="cancle"]:visible'))
          .or(page.getByRole('button', { name: /^\s*(cancel|no)\s*$/i }).filter({ visible: true }))
          .first();
        await cancel.click();
        await expect(pl.assetRemoveConfirmBtn, 'the confirmation closed').toHaveCount(0, { timeout: 5000 });
        await pl.finishEditing().catch(() => {});
        await expect(card, 'the resource is still in the Playlist').toBeVisible();
        await page.reload();
        await expect(user.login.avatar).toBeVisible({ timeout: 30000 });
        await pl.ensureDrawerVisible();
        await expect(pl.resourceCards.filter({ hasText: title }), 'and still there after a reload').toHaveCount(1, {
          timeout: 20000,
        });
      } finally {
        await pl.removeOwnedAsset(pl.resourceCards.filter({ hasText: title })).catch(() => {});
      }
    }
  );

  test(
    'PL-09-07: a drag reorder made while the network is down is either saved once the network is back or clearly reported as not saved',
    { tag: ['@interruption'] },
    async ({ user, page }) => {
      const pl = user.playlist;
      const { card, title } = await addOwned(user);
      // The network drops for the app's own calls (the page itself stays loaded).
      const offline = (route) =>
        ['fetch', 'xhr'].includes(route.request().resourceType())
          ? route.abort('internetdisconnected')
          : route.continue();
      let reported = false;
      try {
        await pl.enterEditMode();
        const order = await pl.cardTitles();
        await card.first().scrollIntoViewIfNeeded();
        const from = await card.first().boundingBox();
        const index = order.findIndex((t) => t.includes(title));
        const target = await pl.resourceCards.nth(Math.max(0, index - 2)).boundingBox();
        await page.route('**/*', offline);
        // The same gentle drag as PL-09-02.
        await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
        await page.mouse.down();
        await page.mouse.move(from.x + from.width / 2 - 8, from.y + from.height / 2, { steps: 4 });
        await page.waitForTimeout(300);
        await page.mouse.move(target.x + target.width / 3, target.y + target.height / 2, { steps: 30 });
        await page.waitForTimeout(500);
        await page.mouse.up();
        await page.waitForTimeout(1500);
        await pl.finishEditing().catch(() => {});
        const moved = await pl.cardTitles();
        expect(
          moved.findIndex((t) => t.includes(title)),
          'set-up: the card moved on screen'
        ).toBeLessThan(index);
        reported = await page
          .getByText(
            /not saved|could not|couldn't|unable to|failed|no (internet|network|connection)|offline|try again/i
          )
          .filter({ visible: true })
          .first()
          .isVisible({ timeout: 8000 })
          .catch(() => false);
        await page.unroute('**/*', offline);
        await page.waitForTimeout(5000); // a chance to save once the network is back
        await page.reload();
        await expect(user.login.avatar).toBeVisible({ timeout: 30000 });
        await pl.ensureDrawerVisible();
        await expect.poll(() => pl.resourceCards.count(), { timeout: 20000 }).toBeGreaterThan(0);
        const after = await pl.cardTitles();
        const kept = JSON.stringify(after) === JSON.stringify(moved);
        test.info().annotations.push({
          type: 'note',
          description: `Order kept after the network came back: ${kept}; failure reported while offline: ${reported}`,
        });
        expect(kept || reported, 'the new order is saved, or the teacher was told it was not').toBe(true);
      } finally {
        await page.unroute('**/*', offline).catch(() => {});
        await pl.removeOwnedAsset(pl.resourceCards.filter({ hasText: title })).catch(() => {});
      }
    }
  );
});
