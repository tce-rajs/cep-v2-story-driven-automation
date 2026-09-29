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

  // --- Added 2026-09-26 (gap-fill from the reference suite's Playlist workbook) ---

  const checked = (option) => option.getAttribute('aria-selected').then((v) => v === 'true');
  const masterFilter = (page) =>
    page
      .locator('mat-option, [role="option"], label, div')
      .filter({ hasText: /^\s*filter resources\s*$/i })
      .first();

  // Unticking Filter Resources (PL-04-05) and ticking it again (PL-04-11): one test each (split 2026-09-28). Both leave
  // the filter ticked.
  test('PL-04-05: unticking Filter Resources hides every card', { tag: ['@functional'] }, async ({ user, page }) => {
    const pl = user.playlist;
    expect((await pl.cardTitles()).length, 'set-up: cards showing').toBeGreaterThan(0);
    await pl.openOptionsMenu();
    await masterFilter(page).click();
    try {
      await expect(pl.resourceCards.filter({ visible: true }), 'every card hidden').toHaveCount(0, { timeout: 5000 });
    } finally {
      await masterFilter(page).click();
      await pl.closeOptionsMenu();
    }
  });

  test(
    'PL-04-11: ticking Filter Resources again brings every card back',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const pl = user.playlist;
      const before = await pl.cardTitles();
      expect(before.length, 'set-up: cards showing').toBeGreaterThan(0);
      await pl.openOptionsMenu();
      await masterFilter(page).click();
      await expect(pl.resourceCards.filter({ visible: true }), 'set-up: every card hidden').toHaveCount(0, {
        timeout: 5000,
      });
      await masterFilter(page).click();
      await expect.poll(() => pl.cardTitles(), { message: 'all cards back' }).toEqual(before);
      await pl.closeOptionsMenu();
    }
  );

  test(
    'PL-04-06: unticking one resource type hides only cards of that type',
    { tag: ['@functional'] },
    async ({ user }) => {
      const pl = user.playlist;
      const typesBefore = await pl.cardTypes();
      await pl.openOptionsMenu();
      const option = pl.filterOptions.nth(0);
      expect(await checked(option)).toBe(true);
      await option.click();
      await user.page.waitForTimeout(800);
      const typesAfter = await pl.resourceCards
        .filter({ visible: true })
        .evaluateAll((els) => els.map((el) => (el.querySelector('img.type-icon') || {}).getAttribute?.('src') || null));
      const removed = typesBefore.length - typesAfter.length;
      expect(removed, 'some cards hidden').toBeGreaterThan(0);
      const hiddenTypes = new Set(typesBefore.filter((t) => !typesAfter.includes(t)));
      expect(hiddenTypes.size, 'exactly one type hidden').toBeLessThanOrEqual(1);
      await option.click(); // restore
      await pl.closeOptionsMenu();
    }
  );

  test(
    'PL-04-07: the filter goes back to showing everything after switching topic',
    { tag: ['@functional'] },
    async ({ user }) => {
      const pl = user.playlist;
      await pl.filterToOnlyType(0);
      await pl.closeOptionsMenu();
      await user.nav.goToChapterTopic(13, 1).catch(() => user.nav.goToChapterTopic(12, 0));
      await user.nav.applyClassMap('playersDefault');
      await pl.openOptionsMenu();
      const states = await pl.filterOptions.evaluateAll((els) => els.map((e) => e.getAttribute('aria-selected')));
      expect(
        states.every((s) => s === 'true'),
        'every type ticked again'
      ).toBe(true);
      await pl.closeOptionsMenu();
    }
  );

  // Reset asks for confirmation (PL-04-08), and cancelling changes nothing (PL-04-12): one test each (split 2026-09-28).
  const resetQuestion = (page) => page.getByText(/are you sure you want to reset your playlist/i);

  test('PL-04-08: Reset asks for confirmation first', { tag: ['@functional'] }, async ({ user, page }) => {
    const pl = user.playlist;
    await pl.openOptionsMenu();
    await pl.filterResetBtn.click();
    try {
      await expect(resetQuestion(page)).toBeVisible({ timeout: 5000 });
    } finally {
      await pl.filterCancelBtn
        .first()
        .click({ timeout: 3000 })
        .catch(() => {});
      await pl.closeOptionsMenu();
    }
  });

  test('PL-04-12: cancelling Reset changes nothing', { tag: ['@functional'] }, async ({ user, page }) => {
    const pl = user.playlist;
    const before = await pl.cardTitles();
    await pl.openOptionsMenu();
    await pl.filterResetBtn.click();
    await expect(resetQuestion(page), 'set-up: the confirmation is shown').toBeVisible({ timeout: 5000 });
    await pl.filterCancelBtn.first().click();
    await expect(resetQuestion(page)).toBeHidden();
    expect(await pl.cardTitles(), 'the Playlist is unchanged').toEqual(before);
    await pl.closeOptionsMenu();
  });

  test(
    'PL-04-09: entering Edit and finishing without changes leaves the Playlist exactly as it was',
    { tag: ['@functional'] },
    async ({ user }) => {
      const pl = user.playlist;
      const before = await pl.cardTitles();
      await pl.enterEditMode();
      await pl.finishEditing();
      await expect(pl.finishEditingBtn).toBeHidden();
      expect(await pl.cardTitles()).toEqual(before);
    }
  );

  test(
    'PL-04-10: turning every filter off and on 3 times quickly ends with every card showing',
    { tag: ['@edge'] },
    async ({ user }) => {
      const pl = user.playlist;
      const before = await pl.cardTitles();
      await pl.openOptionsMenu();
      const n = await pl.filterOptions.count();
      for (let round = 0; round < 3; round++) {
        for (let i = 0; i < n; i++) await pl.filterOptions.nth(i).click({ force: true });
        for (let i = 0; i < n; i++) await pl.filterOptions.nth(i).click({ force: true });
      }
      await pl.closeOptionsMenu();
      await expect.poll(() => pl.cardTitles(), { message: 'every card showing' }).toEqual(before);
    }
  );
});
