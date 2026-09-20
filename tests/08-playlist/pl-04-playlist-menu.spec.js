// PL-04 — Playlist Menu (Edit / Reset / Filter)
// Source: CEPV2_Stories/08_Playlist.md
// Flows confirmed live in the previous suite: Options > Edit enters editing mode (a "Finish editing" button appears,
// per-card remove asks for confirmation); Options > Reset asks "Are you sure you want to reset your playlist?";
// Options lists one checkable entry per resource type (aria-selected), all checked by default.

const { test, expect } = require('../../fixtures');

test.describe('PL-04 Playlist Menu (Edit / Reset / Filter)', () => {
  test.use({ classMap: 'playersDefault' });

  test(
    'PL-04-01: editing the playlist saves changes correctly',
    { tag: ['@smoke', '@functional'] },
    async ({ user, page }) => {
      const { playlist, addResource } = user;
      const before = await playlist.resourceCards.count();

      // Add an asset we own, then remove it through editing mode.
      const title = `AutoTest-${Date.now()}`;
      await addResource.createTextAsset(title);
      const added = playlist.resourceCards.filter({ hasText: title });
      await expect(added).toBeVisible({ timeout: 15000 });
      await expect(playlist.resourceCards).toHaveCount(before + 1);

      await playlist.removeOwnedAsset(added);
      await expect(playlist.resourceCards, 'the removal took effect').toHaveCount(before);

      // "Saves": it is still gone after a reload, not just hidden client-side.
      await page.reload();
      await user.login.avatar.waitFor({ state: 'visible', timeout: 20000 });
      await playlist.ensureDrawerVisible();
      await expect(playlist.resourceCards).toHaveCount(before, { timeout: 15000 });
    }
  );

  test(
    'PL-04-02: resetting the playlist reverts it to the expected state',
    { tag: ['@functional'] },
    async ({ user }) => {
      const { playlist } = user;
      const baseline = await playlist.resourceCards.count();

      // Change the state (narrow the list with a filter), then reset.
      await playlist.filterToOnlyType(0);
      await playlist.resetPlaylist();

      await expect(playlist.resourceCards, 'back to the full list').toHaveCount(baseline);
      await playlist.openOptionsMenu();
      const total = await playlist.filterOptions.count();
      for (let i = 0; i < total; i++) {
        await expect(playlist.filterOptions.nth(i), `filter ${i + 1} is checked again`).toHaveAttribute(
          'aria-selected',
          'true'
        );
      }
    }
  );

  test('PL-04-03: filtering the playlist shows only matching resources', { tag: ['@functional'] }, async ({ user }) => {
    const { playlist } = user;
    await playlist.openOptionsMenu();
    const total = await playlist.filterOptions.count();
    expect(total, 'the menu offers resource-type filters').toBeGreaterThan(1);

    // Find a type that actually has resources here, filter to only that type, and check it is only that type.
    let checked = false;
    for (let keep = 0; keep < total && !checked; keep++) {
      const count = await playlist.filterToOnlyType(keep);
      if (count > 0) {
        const types = await playlist.cardTypes();
        expect(new Set(types).size, 'every remaining card is of the one chosen type').toBe(1);
        checked = true;
      }
    }
    expect(checked, 'at least one type had resources to filter to').toBe(true);
    await playlist.resetPlaylist();
  });

  test(
    'PL-04-04: filtering with a term that matches nothing shows an appropriate empty state, not a blank panel',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const { playlist } = user;
      await playlist.openOptionsMenu();
      const total = await playlist.filterOptions.count();

      // CONFIRMED LIVE (v 0.0.223): the filter menu lists only the resource types this topic actually has ("Video (2)",
      // "Quiz (1)", ...), so there is never a type to filter down to nothing. Unchecking every type is how a filter ends up
      // matching nothing, and the strip then reads "No resources found!".
      for (let i = 0; i < total; i++) {
        const on = (await playlist.filterOptions.nth(i).getAttribute('aria-selected')) === 'true';
        if (on) await playlist.filterOptions.nth(i).click();
      }
      await page.waitForTimeout(1000);

      await expect(playlist.resourceCards, 'no cards match').toHaveCount(0);
      await expect(
        page.getByText(/no (resources|results|assets|items)|nothing (to show|found)/i).first(),
        'an empty-state message is shown, not a blank panel'
      ).toBeVisible();
      await playlist.resetPlaylist();
      await expect(playlist.resourceCards.first(), 'Reset brings the resources back').toBeVisible({ timeout: 10000 });
    }
  );
});
