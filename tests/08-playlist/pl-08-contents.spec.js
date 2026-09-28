// PL-08 — Contents (table of contents)
// Source: CEPV2_Stories/08_Playlist.md
// The Contents tile opens the same Chapters popup as the class bar's chapter/topic button.

const { test, expect } = require('../../fixtures');

test.describe('PL-08 Contents (table of contents)', () => {
  test.use({ classMap: 'playlistGeneral' });

  test.afterEach(async ({ app }) => {
    await app.nav._closeChaptersPopupIfOpen().catch(() => {});
  });

  const openSearch = async (user) => {
    await expect(async () => {
      if (!(await user.nav.chapterTpSearchInput.isVisible()))
        await user.nav.chapterTpSearchToggle.click({ force: true });
      await expect(user.nav.chapterTpSearchInput).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 20000 });
  };

  test(
    'PL-08-01: Contents opens the chapter and topic list with the current topic highlighted',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const current = (await user.whiteboard.currentChapterTopicBtn.innerText()).replace(/\s+/g, ' ');
      await user.playlist.openContentsPopup();
      await expect(user.playlist.contentsPopup).toBeVisible({ timeout: 10000 });
      await expect(user.nav.chapterItems.first()).toBeVisible();
      const active = user.nav.topicItems
        .filter({ has: user.page.locator('.active, .selected') })
        .or(
          user.page.locator(
            '[data-qa-id="playlist-select-topic"].active, [data-qa-id="playlist-select-topic"].selected'
          )
        );
      await expect(active.first(), 'the current topic is highlighted').toBeVisible();
      const topicName = current.split('|').pop().trim();
      await expect(active.first()).toContainText(topicName.slice(0, 15));
    }
  );

  test(
    'PL-08-02: choosing a topic from Contents changes the current topic and reloads the Playlist',
    { tag: ['@functional'] },
    async ({ user }) => {
      const before = await user.whiteboard.currentChapterTopicBtn.innerText();
      const cardsBefore = await user.playlist.cardTitles();
      await user.playlist.openContentsPopup();
      await user.nav.topicItems.nth(1).click();
      await expect(user.whiteboard.currentChapterTopicBtn).not.toHaveText(before, { timeout: 10000 });
      await expect
        .poll(() => user.playlist.cardTitles(), { message: 'Playlist reloaded for the new topic' })
        .not.toEqual(cardsBefore);
    }
  );

  test(
    'PL-08-03: searching Contents finds topics regardless of letter case',
    { tag: ['@functional'] },
    async ({ user }) => {
      await user.playlist.openContentsPopup();
      const word = ((await user.nav.topicItems.first().innerText()).match(/\p{L}{4,}/u) || ['charge'])[0];
      await openSearch(user);
      await user.nav.searchContents(word.toUpperCase());
      const upper = await user.nav.topicItems.allInnerTexts();
      await user.nav.searchContents(word.toLowerCase());
      const lower = await user.nav.topicItems.allInnerTexts();
      expect(upper.length, 'upper-case search finds it').toBeGreaterThan(0);
      expect(upper).toEqual(lower);
    }
  );

  test('PL-08-04: Cancel brings back the full list after a search', { tag: ['@functional'] }, async ({ user }) => {
    await user.playlist.openContentsPopup();
    const chapters = await user.nav.chapterItems.count();
    await openSearch(user);
    await user.nav.searchContents('electric');
    await user.nav.chapterTpSearchCancel.click();
    await expect.poll(() => user.nav.chapterItems.count(), { message: 'full chapter list back' }).toBe(chapters);
  });

  test(
    'PL-08-05: a search with no matches shows a message, not a blank panel',
    { tag: ['@negative', '@bug'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232): same defect as NAV-02-02 -- a Contents search with no
      // matches shows an empty panel, with no "no results" message.
      test.fail(true, 'A Contents search with no matches shows a blank panel, no empty-state message');
      await user.playlist.openContentsPopup();
      await openSearch(user);
      await user.nav.searchContents('zzqxwv');
      await expect(user.nav.topicItems).toHaveCount(0);
      await expect(
        user.playlist.contentsPopup.getByText(/no (result|match|topic)s?|not found/i),
        'a no-results message'
      ).toBeVisible();
    }
  );

  test('PL-08-06: a very long search is handled without error', { tag: ['@edge'] }, async ({ user, page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await user.playlist.openContentsPopup();
    await openSearch(user);
    await user.nav.searchContents('electric field '.repeat(25));
    await expect(user.playlist.contentsPopup).toBeVisible();
    await user.nav.chapterTpSearchCancel.click();
    await expect(user.nav.chapterItems.first()).toBeVisible();
    expect(errors).toEqual([]);
  });
});
