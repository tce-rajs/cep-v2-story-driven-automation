// PLR-04 — Navigate an ebook
// Source: CEPV2_Stories/11_Players.md
// Data: the 'ebook' topic (Class 12A Physics, chapter 14) holds one linked e-book, "(CE Crystal) NCERT Physics Class 12".
// (Opening an ebook FROM THE PLAYLIST is PL-02; these stories are about navigating inside the player.)

const { test, expect } = require('../../fixtures');

test.describe('PLR-04 Navigate an ebook', () => {
  test.use({ classMap: 'ebook' });

  const openEbook = async (user) => {
    await user.player.ebookTriggerBtn.click({ force: true });
    await expect(user.player.ebookLaunchBtn.first()).toBeVisible({ timeout: 10000 });
    await user.player.ebookLaunchBtn.first().click({ force: true });
    expect(await user.player.isPlayerOpen(), 'the ebook player opened').toBe(true);
    // CONFIRMED LIVE (see PL-02): the chapters only appear 1-2s after launch.
    await expect(user.player.ebookChapterItems.first(), 'the ebook lists its chapters').toBeAttached({
      timeout: 20000,
    });
    await user.page.waitForTimeout(1000);
  };

  // The contents panel starts collapsed: every chapter is in the DOM but none is visible until its toggle is used, and
  // choosing a chapter can collapse it again -- so open it before each click. Clicks are DOM-level because the page bar
  // overlaps the bottom of the list (see PlayerPage.domClick). A chapter is marked selected only once its content loads.
  const visibleChapters = (user) => user.player.ebookChapterItems.filter({ visible: true });
  const ensureContentsOpen = async (user) => {
    if ((await visibleChapters(user).count()) === 0) await user.player.domClick(user.player.ebookChapterDrawerToggle);
    await expect.poll(() => visibleChapters(user).count(), { message: 'contents panel open' }).toBeGreaterThan(1);
  };
  const jumpTo = async (user, index) => {
    await ensureContentsOpen(user);
    await user.player.domClick(user.player.ebookChapterItems.nth(index));
  };

  test(
    'PLR-04-01: opening a chapter-specific ebook resource and navigating to a new chapter works',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await openEbook(user);
      const chapters = user.player.ebookChapterItems;
      expect(await chapters.count(), 'the ebook has more than one chapter').toBeGreaterThan(1);

      await jumpTo(user, 1);
      await expect(chapters.nth(1), 'the new chapter is now the selected one').toHaveClass(/selected/, {
        timeout: 20000,
      });
      await expect(chapters.nth(0)).not.toHaveClass(/selected/);
    }
  );

  test(
    'PLR-04-02: scrolling/paginating through ebook pages works correctly',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await openEbook(user);
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      const selected = await user.player.ebookSelectedChapter.count();

      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, 600);
        await page.waitForTimeout(200);
      }
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, -600);
        await page.waitForTimeout(200);
      }

      expect(await user.player.isPlayerOpen(3000), 'the ebook is still open').toBe(true);
      await expect(user.player.ebookSelectedChapter, 'one chapter still selected').toHaveCount(selected);
      expect(errors, 'no uncaught page errors').toEqual([]);
    }
  );

  test(
    'PLR-04-03: closing a linked resource from the ebook closes it cleanly',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openEbook(user);
      await user.player.domClick(user.player.ebookResourceDrawerToggle);
      const linked = user.player.ebookResourceCards;
      await expect(linked.first().or(user.player.ebookNoResourcesMsg)).toBeVisible({ timeout: 10000 });
      test.skip(
        (await linked.count()) === 0,
        'CONFIRMED LIVE: this ebook ("(CE Crystal) NCERT Physics Class 12") has no linked resources ("No resources found!"), so there is nothing to open and close'
      );

      await user.player.openResourceCard(linked);
      await user.page.waitForTimeout(2000);
      const withLinkedOpen = await user.player.closeIcon.count();
      expect(withLinkedOpen, 'the linked resource opened on top of the ebook').toBeGreaterThanOrEqual(2);

      await user.player.closePlayer(); // closes the topmost: the linked resource
      await user.page.waitForTimeout(1000);
      await expect(user.player.closeIcon, 'only the linked resource closed').toHaveCount(withLinkedOpen - 1);
      await expect(user.player.ebookChapterItems.first(), 'the ebook underneath is intact').toBeAttached();
    }
  );

  test(
    'PLR-04-04: chapter-jump, pagination and scroll do not reproduce CEP v1’s recurring ebook navigation weak spot',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await openEbook(user);
      const chapters = user.player.ebookChapterItems;
      const last = (await chapters.count()) - 1;

      // Jump around; each jump must land on the chapter asked for, every time.
      for (const target of [1, last, 0, last, 1, 0]) {
        await jumpTo(user, target);
        await expect(chapters.nth(target), `chapter ${target + 1} selected after jumping to it`).toHaveClass(
          /selected/,
          {
            timeout: 20000,
          }
        );
      }
      // Then scroll: it must neither throw nor change chapter by itself.
      for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 800);
      await page.waitForTimeout(500);
      await expect(chapters.nth(0), 'scrolling did not switch chapter on its own').toHaveClass(/selected/);
      // "Worker was terminated" is the browser reporting a PDF worker from a previously closed worksheet being torn down; it
      // surfaced once in a full-suite run and is not an ebook error.
      expect(
        errors.filter((e) => !/worker was terminated/i.test(e)),
        'no uncaught page errors'
      ).toEqual([]);
    }
  );
});
