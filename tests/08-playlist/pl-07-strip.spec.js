// PL-07 — Playlist strip
// Source: CEPV2_Stories/08_Playlist.md

const { test, expect } = require('../../fixtures');

test.describe('PL-07 Playlist strip', () => {
  test.use({ classMap: 'playlistGeneral' });

  // The Contents tile (PL-07-05) and the cards' type icons (PL-07-06): one test each. The E-Books tile is PL-07-01 below.

  test('PL-07-05: the strip shows the Contents tile', { tag: ['@smoke', '@functional'] }, async ({ user }) => {
    await expect(user.playlist.contentsTile).toBeVisible();
  });

  test(
    'PL-07-06: the strip shows the resource cards, each card with its type icon',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const pl = user.playlist;
      await expect(pl.resourceCards.first()).toBeVisible({ timeout: 15000 });
      const types = await pl.cardTypes();
      expect(types.length).toBeGreaterThan(0);
      expect(
        types.filter((t) => !t),
        'every card has a type icon'
      ).toEqual([]);
    }
  );

  test(
    'PL-07-02: the Contents tile shows the current chapter and topic',
    { tag: ['@functional'] },
    async ({ user }) => {
      const current = (await user.whiteboard.currentChapterTopicBtn.innerText()).replace(/\s+/g, ' ');
      const position = current.match(/\d+\.\d+/)[0];
      await expect(user.playlist.contentsTile, `Contents shows ${position}`).toContainText(position);
    }
  );

  test(
    'PL-07-03: the arrows scroll the strip when there are more cards than fit',
    { tag: ['@functional'] },
    async ({ user }) => {
      const pl = user.playlist;
      // The cards sit in a scrolling .resource-playlist-box; each arrow click scrolls it ~40px.
      const box = user.page.locator('.resource-playlist-box').first();
      const overflowing = await box.evaluate((el) => el.scrollWidth > el.clientWidth);
      test.skip(!overflowing, 'All cards already fit in this topic, so there is nothing to scroll.');
      const scroll = () => box.evaluate((el) => el.scrollLeft);
      const start = await scroll();
      await pl.rightScrollBtn.click();
      await pl.rightScrollBtn.click();
      await expect.poll(scroll, { message: 'the strip scrolled right' }).toBeGreaterThan(start);
      const right = await scroll();
      await pl.leftScrollBtn.click();
      await expect.poll(scroll, { message: 'and back left' }).toBeLessThan(right);
    }
  );

  test('PL-07-04: a topic with 20 or more resources keeps the strip usable', { tag: ['@edge'] }, async ({ user }) => {
    const pl = user.playlist;
    const count = await pl.resourceCards.count();
    test.skip(count < 20, `Needs a topic with 20+ resources; this one has ${count}.`);
    await expect(pl.contentsTile).toBeInViewport();
    await expect(pl.addResourcesTrigger).toBeInViewport();
    // The last card can be reached and opened.
    await user.player.openResourceCard(pl.resourceCards.last());
    expect(await user.player.isPlayerOpen(20000)).toBe(true);
    await user.player.closePlayer();
  });

  test(
    'PL-07-07: no card shows a missing (broken) type icon or an empty title',
    { tag: ['@negative'] },
    async ({ user }) => {
      const pl = user.playlist;
      await expect(pl.resourceCards.first(), 'set-up: cards shown').toBeVisible({ timeout: 15000 });
      // Make every card's icon load (cards further along the strip load as they scroll in).
      await pl.resourceCards.evaluateAll((els) => els.forEach((e) => e.scrollIntoView({ inline: 'center' })));
      await pl.resourceCards.first().evaluate((e) => e.scrollIntoView({ inline: 'center' }));
      await user.page.waitForTimeout(2000);
      const cards = await pl.resourceCards.evaluateAll((els) =>
        els.map((el, i) => {
          const icon = el.querySelector('img.type-icon');
          return {
            i,
            text: (el.innerText || '').replace(/\s+/g, ' ').trim(),
            icon: icon ? icon.getAttribute('src') : null,
            iconLoaded: !!icon && icon.complete && icon.naturalWidth > 0,
          };
        })
      );
      const broken = cards.filter((c) => !c.iconLoaded).map((c) => `card ${c.i + 1} "${c.text}" icon ${c.icon}`);
      const untitled = cards.filter((c) => !c.text || /undefined|null/i.test(c.text)).map((c) => `card ${c.i + 1}`);
      expect(broken, 'every type icon loads').toEqual([]);
      expect(untitled, 'every card has a title').toEqual([]);
    }
  );
});

test.describe('PL-07 Playlist strip: E-Books tile', () => {
  // The E-Books tile shows where the class and subject have an e-book: the 'ebook' entry (Class 11A Mathematics).
  test.use({ classMap: 'ebook' });

  test('PL-07-01: the strip shows the E-Books tile', { tag: ['@smoke', '@functional'] }, async ({ user }) => {
    await expect(user.playlist.eBooksTile).toBeVisible();
  });
});
