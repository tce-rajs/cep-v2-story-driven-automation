// MM-04 — Minimap alongside other panels
// Source: CEPV2_Stories/12_Minimap.md
// Data: 'playersDefault' holds a Worksheet (PDF), used as "an open player". The Players toggle
// (minimap-toggle-players-btn) is only rendered while a player is open.

const { test, expect } = require('../../fixtures');

test.describe('MM-04 Minimap alongside other panels', () => {
  test.afterEach(async ({ app }) => {
    await app.minimap.close().catch(() => {});
    await app.player.closePlayer().catch(() => {});
  });

  test('MM-04-01: the Players toggle hides and shows an open player', { tag: ['@functional'] }, async ({ user }) => {
    await user.nav.applyClassMap('playersDefault');
    await user.playlist.ensureDrawerVisible();
    await expect(user.player.worksheetCards.first()).toBeAttached({ timeout: 15000 });
    await user.player.openResourceCard(user.player.worksheetCards);
    expect(await user.player.isPlayerOpen(), 'a player is open').toBe(true);

    await user.minimap.open(user.toolbar);
    await expect(user.minimap.playersToggleBtn, 'Players toggle appears while a player is open').toBeVisible();

    // CONFIRMED LIVE (2026-09-26): the toggle does not hide the player window itself; it switches whether open players
    // are drawn in the Minimap's overview.
    const overview = () => user.minimap.canvas.evaluate((c) => c.toDataURL());
    const before = await overview();
    await user.minimap.playersToggleBtn.click({ force: true });
    await expect.poll(overview, { message: 'the overview changed' }).not.toBe(before);
    await user.minimap.playersToggleBtn.click({ force: true });
    await expect.poll(overview, { message: 'and changed back' }).toBe(before);
    await expect(user.player.closeIcon.first(), 'the player itself stays open').toBeVisible();
  });

  test(
    'MM-04-02: the open Minimap does not cover the Playlist strip or the Add Resource button',
    { tag: ['@edge'] },
    async ({ user }) => {
      await user.playlist.ensureDrawerVisible();
      await user.minimap.open(user.toolbar);
      const mm = await user.minimap.container.boundingBox();
      const overlaps = (a, b) =>
        a && b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

      const addBtn = await user.playlist.addResourcesTrigger.boundingBox();
      expect(overlaps(mm, addBtn), 'Minimap does not cover the Add Resource button').toBeFalsy();
      const contents = await user.playlist.contentsTile.boundingBox();
      expect(overlaps(mm, contents), 'Minimap does not cover the Playlist strip (Contents tile)').toBeFalsy();
      // And the covered-looking area is still clickable: the Add Resource button responds.
      await user.playlist.addResourcesTrigger.click();
      await expect(user.playlist.addResourcesActions.create).toBeVisible({ timeout: 10000 });
      await user.playlist.addResourcesCloseBtn.click({ force: true }).catch(() => {});
    }
  );
});
