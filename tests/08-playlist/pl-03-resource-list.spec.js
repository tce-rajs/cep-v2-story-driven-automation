// PL-03 — Resource List
// Source: CEPV2_Stories/08_Playlist.md

const { test, expect } = require('../../fixtures');

const intersects = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test.describe('PL-03 Resource List', () => {
  test.describe('after closing resource previews', () => {
    test.use({ classMap: 'playersDefault' });

    test(
      'PL-03-01: the Playlist strip, Contents and Add-Resource controls do not become invisible after closing certain resource previews',
      { tag: ['@regression'] },
      async ({ user }) => {
        const { player, playlist, addResource } = user;
        for (const [name, cards] of [
          ['PDF', player.worksheetCards],
          ['video', player.videoCards],
          ['image', player.imageCards],
          ['weblink', player.weblinkCards],
        ]) {
          await expect(cards.first(), `${name} card present`).toBeAttached({ timeout: 10000 });
          await player.openResourceCard(cards);
          expect(await player.isPlayerOpen(), `${name} opened`).toBe(true);
          await player.closePlayer();

          await expect(playlist.contentsTile, `Contents visible after closing the ${name}`).toBeVisible();
          await expect(playlist.resourceCards.first(), `strip visible after closing the ${name}`).toBeVisible();
          await expect(addResource.addResourcesTrigger, `Add Resource visible after closing the ${name}`).toBeVisible();
        }
      }
    );
  });

  test.describe('with a split-screen quiz', () => {
    test.use({ classMap: 'quiz' });

    test(
      'PL-03-02: the resource list does not overlap a split-screen quiz panel',
      { tag: ['@functional'] },
      async ({ user }) => {
        const { player, playlist } = user;
        await expect(player.quizCards.first()).toBeAttached({ timeout: 10000 });
        await player.openResourceCard(player.quizCards);
        if (await player.quizLaunchScreenBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
          await player.quizLaunchScreenBtn.click({ force: true });
        }
        if (await player.quizClassStrengthStartBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
          await player.quizClassStrengthStartBtn.click({ force: true });
        }
        await expect(player.quizRenderer).toBeVisible({ timeout: 20000 });

        await player.quizSplitScreenBtn.click({ force: true });
        await user.page.waitForTimeout(1500);

        const quizBox = await player.quizRenderer.boundingBox();
        expect(quizBox, 'quiz panel is on screen').not.toBeNull();
        for (const card of await playlist.resourceCards.all()) {
          if (!(await card.isVisible())) continue;
          const cardBox = await card.boundingBox();
          expect(intersects(cardBox, quizBox), 'a Playlist card must not sit on top of the quiz panel').toBe(false);
        }
      }
    );
  });
});
