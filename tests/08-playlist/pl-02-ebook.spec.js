// PL-02 — Open & navigate Ebook (from Playlist)
// Source: CEPV2_Stories/08_Playlist.md
// Data: the 'ebook' topic (Class 12A Physics, chapter 14) holds one linked e-book, "(CE Crystal) NCERT Physics Class 12".

const { test, expect } = require('../../fixtures');

test.describe('PL-02 Open & navigate Ebook', () => {
  test.use({ classMap: 'ebook' });

  const openEbook = async (user) => {
    await user.player.ebookTriggerBtn.click({ force: true });
    await expect(user.player.ebookLaunchBtn.first()).toBeVisible({ timeout: 10000 });
    await user.player.ebookLaunchBtn.first().click({ force: true });
    // CONFIRMED LIVE: the chapters only appear 1-2s after the launch click; reading or clicking them sooner finds none.
    await expect(user.player.ebookChapterItems.first(), 'the ebook lists its chapters').toBeAttached({
      timeout: 20000,
    });
    await user.page.waitForTimeout(1000);
  };

  // CONFIRMED LIVE: the contents panel starts collapsed -- every chapter is in the DOM but none is visible; one click
  // on its toggle shows them all. So "open" means chapters are visible and "closed" means none are.
  const visibleChapters = (user) => user.player.ebookChapterItems.filter({ visible: true });
  const ensureContentsOpen = async (user) => {
    if ((await visibleChapters(user).count()) === 0) await user.player.domClick(user.player.ebookChapterDrawerToggle);
    await expect.poll(() => visibleChapters(user).count(), { message: 'contents panel open' }).toBeGreaterThan(1);
  };

  test(
    'PL-02-01: opening an ebook from Playlist loads it correctly',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      // NOTE: on 2026-09-23 this reproducibly failed to open (no close icon, no chapters) on two separate QA
      // servers/accounts across several attempts -- tracked at the time as a confirmed product bug. Re-tested later
      // the same day: the ebook now opens and works reliably, repeatedly, including in isolation. Reverted the
      // test.fail() marking since it currently works; if this recurs, it is likely QA-environment flakiness
      // (a degraded backend/CDN at the time) rather than a stable regression -- re-confirm before re-marking.
      await openEbook(user);
      expect(await user.player.isPlayerOpen(), 'the ebook player opened').toBe(true);
      await expect(user.player.ebookChapterItems.first(), 'the ebook lists its chapters').toBeAttached({
        timeout: 15000,
      });
    }
  );

  test(
    'PL-02-02: navigating chapters/pages within the opened ebook works correctly',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openEbook(user);
      const chapters = user.player.ebookChapterItems;
      expect(await chapters.count(), 'more than one chapter to navigate between').toBeGreaterThan(1);

      await ensureContentsOpen(user);
      await user.player.domClick(chapters.nth(1));
      // CONFIRMED LIVE: the chapter is only marked selected once its content has loaded, which can take several seconds.
      await expect(chapters.nth(1), 'the chosen chapter becomes the selected one').toHaveClass(/selected/, {
        timeout: 20000,
      });
      await expect(chapters.nth(0)).not.toHaveClass(/selected/);
    }
  );

  test(
    'PL-02-03: the ebook’s panels (contents, linked resources) open and close correctly',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openEbook(user);
      const {
        ebookChapterDrawerToggle: contents,
        ebookResourceDrawerToggle: linked,
        ebookChapterItems: chapters,
        ebookResourceCards: resources,
      } = user.player;

      // Contents panel: open, then close.
      await expect.poll(() => visibleChapters(user).count(), { message: 'starts collapsed' }).toBe(0);
      await user.player.domClick(contents);
      await expect.poll(() => visibleChapters(user).count(), { message: 'contents panel opens' }).toBeGreaterThan(1);
      await user.page.waitForTimeout(1000); // let the open animation finish before toggling again
      await user.player.domClick(contents);
      await expect.poll(() => visibleChapters(user).count(), { message: 'contents panel closes' }).toBe(0);

      // Linked-resources panel: open, then close.
      await user.player.domClick(linked);
      await expect(resources.first().or(user.player.ebookNoResourcesMsg), 'linked-resources panel opens').toBeVisible();
      await user.player.domClick(linked);
      await expect(resources.first().or(user.player.ebookNoResourcesMsg), 'linked-resources panel closes').toBeHidden();
    }
  );

  test(
    'PL-02-04: chapter-jump, pagination and scroll do not reproduce CEP v1’s recurring ebook navigation weak spot',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await openEbook(user);
      const chapters = user.player.ebookChapterItems;
      const last = (await chapters.count()) - 1;

      // Jump around: forward, to the far end, back to the start. Each jump must land on the chapter asked for.
      for (const target of [1, last, 0, last, 1]) {
        await ensureContentsOpen(user); // choosing a chapter can collapse the panel again
        await user.player.domClick(chapters.nth(target));
        await expect(chapters.nth(target), `chapter ${target + 1} is selected after jumping to it`).toHaveClass(
          /selected/,
          { timeout: 20000 }
        );
      }

      // Scroll through the page content; nothing may throw or jump chapters.
      const selectedBefore = await user.player.ebookSelectedChapter.count();
      for (let i = 0; i < 8; i++) {
        await page.mouse.wheel(0, 700);
        await page.waitForTimeout(150);
      }
      for (let i = 0; i < 8; i++) {
        await page.mouse.wheel(0, -700);
        await page.waitForTimeout(150);
      }
      await expect(user.player.ebookSelectedChapter, 'exactly one chapter stays selected').toHaveCount(selectedBefore);
      // "Worker was terminated" is the browser reporting a PDF worker from a previously closed worksheet being torn down
      // (same benign noise PLR-04-04 already filters); not an ebook error.
      expect(
        errors.filter((e) => !/worker was terminated/i.test(e)),
        'no uncaught page errors'
      ).toEqual([]);
    }
  );
});
