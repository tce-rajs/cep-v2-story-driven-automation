// NAV-04 — List Topics
// Source: CEPV2_Stories/07_ClassNavigation.md

const { test, expect } = require('../../fixtures');

test.describe('NAV-04 List Topics', () => {
  // The list (NAV-04-01) and choosing a topic from it (NAV-04-03): one test each.
  const showFirstChapterTopics = async (user) => {
    await user.nav.resetToClass('Class 12', 'A', 'Physics');
    await user.nav.showTopicsOf(0);
    await expect(user.nav.topicItems.first()).toBeVisible();
    return (await user.nav.topicItems.allInnerTexts()).map((t) => t.trim());
  };

  test(
    'NAV-04-01: the topic list displays correctly for a selected chapter, every topic with a title',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const topics = await showFirstChapterTopics(user);
      expect(topics.length).toBeGreaterThan(0);
      for (const topic of topics) expect(topic.length, 'every topic has a title').toBeGreaterThan(0);
    }
  );

  test(
    'NAV-04-03: choosing a topic from the list makes it the current topic',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const topics = await showFirstChapterTopics(user);
      await user.nav.topicItems.first().click({ timeout: 10000 });
      await user.page.waitForTimeout(800);
      // Each topic's text starts with an icon label ("article"); its title is on the following line.
      const title = topics[0]
        .split('\n')
        .map((t) => t.trim())
        .filter((t) => t && t !== 'article')[0];
      await expect(user.nav.currentChapterTopicBtn).toContainText(title.slice(0, 12));
    }
  );

  test(
    'NAV-04-02: a chapter with zero topics shows an appropriate empty state',
    { tag: ['@negative'] },
    async ({ user }) => {
      test.setTimeout(6 * 60 * 1000); // up to 29 chapters, each needing the popup reopened
      // Class 9A Hindi is the widest list (29 chapters). Look for one with no topics.
      // SCANNED: no chapter with zero topics in Class 12A Physics / Computer Science, Class 5A Mathematics,
      // Class 11A Accountancy, Class 9A Hindi, Early Childhood Education (4 subjects) or Class 1A (8 subjects). The account
      // has 169 class/subject combinations; a scan of all of them takes about 3 hours and was not completed.
      await user.nav.resetToClass('Class 9', 'A', 'Hindi Language');
      await user.nav.openChaptersPopup();
      const chapters = await user.nav.chapterItems.count();

      // Picking a chapter with topics jumps to its first topic and closes the popup (see NavigationPage.showTopicsOf),
      // so a chapter that leaves the popup open with an empty topic list is the one with no topics.
      const popupOpen = () =>
        user.nav.chapterItems
          .first()
          .isVisible()
          .catch(() => false);
      let emptyChapter = -1;
      for (let i = 0; i < chapters; i++) {
        if (!(await popupOpen())) await user.nav.openChaptersPopup();
        await user.nav.chapterItems
          .nth(i)
          .click({ timeout: 10000 })
          .catch(() => {});
        await user.page.waitForTimeout(700);
        if ((await popupOpen()) && (await user.nav.topicItems.count()) === 0) {
          emptyChapter = i;
          break;
        }
      }
      test.skip(
        emptyChapter === -1,
        `none of the ${chapters} chapters in Class 9A Hindi has zero topics — no data to check this against`
      );

      await expect(
        user.nav.chapterTpPopup.getByText(/no (topic|result|data|content)|not available|nothing/i).first()
      ).toBeVisible();
    }
  );

  test(
    'NAV-04-04: topics are listed in number order (1.1, 1.2, 1.3 ...)',
    { tag: ['@functional'] },
    async ({ user }) => {
      // The list shows topic names only; the number appears on the topic button once a topic is chosen. Choosing the
      // first four topics in list order must give 1.1, 1.2, 1.3, 1.4.
      await showFirstChapterTopics(user);
      const shown = [];
      for (let i = 0; i < 4; i++) {
        await user.nav.goToChapterTopic(0, i);
        const label = (await user.nav.currentChapterTopicBtn.innerText()).replace(/\s+/g, ' ');
        shown.push((label.match(/(\d+\.\d+)/) || [])[1]);
      }
      expect(shown, 'topics in number order').toEqual(['1.1', '1.2', '1.3', '1.4']);
    }
  );
});
