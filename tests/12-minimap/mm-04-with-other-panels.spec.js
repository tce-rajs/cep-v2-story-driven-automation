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

  // The Players toggle, with a worksheet open: the story says it "hides and shows an open player". CONFIRMED LIVE
  // (2026-09-26): it does not hide the player window itself; it switches whether open players are drawn in the Minimap's
  // overview. Split 2026-09-28: off (MM-04-01), back on (MM-04-03), and the window itself stays open (MM-04-04).
  const openWorksheetAndMinimap = async (user) => {
    await user.nav.applyClassMap('playersDefault');
    await user.playlist.ensureDrawerVisible();
    await expect(user.player.worksheetCards.first()).toBeAttached({ timeout: 15000 });
    await user.player.openResourceCard(user.player.worksheetCards);
    expect(await user.player.isPlayerOpen(), 'set-up: a player is open').toBe(true);
    await user.minimap.open(user.toolbar);
    await expect(user.minimap.playersToggleBtn, 'Players toggle appears while a player is open').toBeVisible();
    return () => user.minimap.canvas.evaluate((c) => c.toDataURL());
  };
  const storyNote = () =>
    test.info().annotations.push({
      type: 'note',
      description: 'Story says the toggle hides/shows the player; live, it switches the player in the overview only.',
    });

  test(
    'MM-04-01: the Players toggle takes the open player out of the Minimap overview',
    { tag: ['@functional'] },
    async ({ user }) => {
      storyNote();
      const overview = await openWorksheetAndMinimap(user);
      const before = await overview();
      await user.minimap.playersToggleBtn.click({ force: true });
      await expect.poll(overview, { message: 'the overview changed' }).not.toBe(before);
    }
  );

  test(
    'MM-04-03: pressing the Players toggle again puts the open player back in the Minimap overview',
    { tag: ['@functional'] },
    async ({ user }) => {
      storyNote();
      const overview = await openWorksheetAndMinimap(user);
      const before = await overview();
      await user.minimap.playersToggleBtn.click({ force: true });
      await expect.poll(overview, { message: 'set-up: the overview changed' }).not.toBe(before);
      await user.minimap.playersToggleBtn.click({ force: true });
      await expect.poll(overview, { message: 'and changed back' }).toBe(before);
    }
  );

  test(
    'MM-04-04: the Players toggle leaves the player window itself open',
    { tag: ['@functional'] },
    async ({ user }) => {
      storyNote();
      await openWorksheetAndMinimap(user);
      await user.minimap.playersToggleBtn.click({ force: true });
      await user.page.waitForTimeout(1000);
      await expect(user.player.closeIcon.first(), 'the player itself stays open').toBeVisible();
    }
  );

  // The open Minimap covers neither the Add Resource button (MM-04-02) nor the Playlist strip (MM-04-05) -- one test
  // each (split 2026-09-28).
  const overlaps = (a, b) =>
    a && b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

  test(
    'MM-04-02: the open Minimap does not cover the Add Resource button, which still responds',
    { tag: ['@edge'] },
    async ({ user }) => {
      await user.playlist.ensureDrawerVisible();
      await user.minimap.open(user.toolbar);
      const mm = await user.minimap.container.boundingBox();
      const addBtn = await user.playlist.addResourcesTrigger.boundingBox();
      expect(overlaps(mm, addBtn), 'Minimap does not cover the Add Resource button').toBeFalsy();
      await user.playlist.addResourcesTrigger.click();
      await expect(user.playlist.addResourcesActions.create).toBeVisible({ timeout: 10000 });
      await user.playlist.addResourcesCloseBtn.click({ force: true }).catch(() => {});
    }
  );

  test('MM-04-05: the open Minimap does not cover the Playlist strip', { tag: ['@edge'] }, async ({ user }) => {
    await user.playlist.ensureDrawerVisible();
    await user.minimap.open(user.toolbar);
    const mm = await user.minimap.container.boundingBox();
    const contents = await user.playlist.contentsTile.boundingBox();
    expect(overlaps(mm, contents), 'Minimap does not cover the Playlist strip (Contents tile)').toBeFalsy();
  });
});
