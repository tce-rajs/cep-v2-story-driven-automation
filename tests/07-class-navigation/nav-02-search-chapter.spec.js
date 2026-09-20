// NAV-02 — Search Chapter
// Source: CEPV2_Stories/07_ClassNavigation.md
// CONFIRMED LIVE (v 0.0.223): the search box in the Chapters popup is a "Search Table of Contents". It matches TOPICS
// (listed under "Choose a Topic"; the chapter list is hidden), runs on Enter/submit and shows nothing for an empty query.

const { test, expect } = require('../../fixtures');

test.describe('NAV-02 Search Chapter', () => {
  let chapterName;

  test.beforeEach(async ({ user }) => {
    await user.nav.resetToClass('Class 12', 'A', 'Physics'); // English chapter and topic titles
    await user.nav.openChaptersPopup();
    // Read a real chapter title BEFORE opening the search: the search view hides the chapter list.
    chapterName = (await user.nav.chapterItems.first().innerText()).replace(/\s+/g, ' ').trim();
    // The toggle occasionally swallows the first click straight after the popup opens (seen once in a full-suite run), so
    // click it again until the search box is actually there.
    await expect(async () => {
      if (!(await user.nav.chapterTpSearchInput.isVisible()))
        await user.nav.chapterTpSearchToggle.click({ force: true });
      await expect(user.nav.chapterTpSearchInput).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 20000 });
  });

  test(
    'NAV-02-01: searching for a chapter returns accurate results',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      // Use a real word from a real chapter title ("Chapter 1. Electric Charges and Fields" -> "Electric").
      const title = chapterName.replace(/^Chapter\s*\d+\.?\s*/i, '');
      const term = (title.match(/\p{L}{4,}/u) || [title.slice(0, 4)])[0];

      await user.nav.searchContents(term);

      const results = (await user.nav.topicItems.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
      expect(results.length, `"${term}" finds at least one match`).toBeGreaterThan(0);
      for (const result of results) {
        expect(result.toLowerCase(), 'every result actually matches the search').toContain(term.toLowerCase());
      }
      expect(
        results.some((r) => r.toLowerCase().includes(title.toLowerCase())),
        `the chapter the word came from ("${title}") is among the results`
      ).toBe(true);
    }
  );

  test(
    'NAV-02-02: a search with zero matches shows an appropriate empty-state message',
    { tag: ['@negative', '@bug'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (v 0.0.223): a search with no matches shows nothing at all -- the popup holds
      // only its "Cancel" button, with no "no results" message. Tracked as expected-to-fail so it isn't masked.
      test.fail(true, 'A search with zero matches shows a blank popup, no empty-state message');
      await user.nav.searchContents('zzzqqqxxx999');

      await expect(user.nav.topicItems, 'no results listed').toHaveCount(0);
      await expect(
        user.nav.chapterTpPopup.getByText(/no (result|chapter|topic|match|data)|not found|nothing/i).first()
      ).toBeVisible();
    }
  );

  test(
    'NAV-02-03: special characters or a very long query do not break the search',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));

      for (const query of ['<script>alert(1)</script>', `'"%_\\;--${'&*()[]{}^~`'.repeat(3)}`, 'a'.repeat(2000)]) {
        await user.nav.searchContents(query);
        await expect(user.nav.chapterTpSearchInput, 'the field still works').toBeVisible();
      }

      // Search recovers: Cancel brings the full chapter list back.
      await user.nav.chapterTpSearchCancel.click({ timeout: 5000 });
      await expect(user.nav.chapterItems.first(), 'the chapter list is restored').toBeVisible({ timeout: 8000 });
      expect(await user.nav.chapterItems.count()).toBeGreaterThan(0);
      expect(errors, 'no uncaught page errors').toEqual([]);
    }
  );
});
