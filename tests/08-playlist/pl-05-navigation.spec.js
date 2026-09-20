// PL-05 — Navigation
// Source: CEPV2_Stories/08_Playlist.md
// Not automated (per PROCESS.md, Plan Mode is manual-only): PL-05-02.

const { test, expect } = require('../../fixtures');

test.describe('PL-05 Navigation', () => {
  test.use({ classMap: 'playlistGeneral' });

  test(
    'PL-05-01: switching topics/chapters rapidly, several times, before each finishes loading does not corrupt Playlist state',
    { tag: ['@regression'] },
    async ({ user }) => {
      const { nav, playlist } = user;
      const topicA = [0, 0];
      const topicB = [1, 0];

      await nav.goToChapterTopic(...topicA);
      const titlesA = await playlist.cardTitles();
      await nav.goToChapterTopic(...topicB);
      const titlesB = await playlist.cardTitles();
      expect(titlesA, 'the two topics have different Playlists to tell apart').not.toEqual(titlesB);

      // Six back-to-back switches with no waiting for the previous one to finish loading.
      for (let i = 0; i < 6; i++) {
        const [chapter, topic] = i % 2 ? topicA : topicB;
        await nav.currentChapterTopicBtn.click({ force: true, timeout: 3000 }).catch(() => {});
        await nav.chapterItems
          .nth(chapter)
          .click({ force: true, timeout: 3000 })
          .catch(() => {});
        await nav.topicItems
          .nth(topic)
          .click({ force: true, timeout: 3000 })
          .catch(() => {});
      }
      await user.page.waitForTimeout(3000);

      // Each topic still shows exactly its own Playlist — nothing mixed in, nothing missing.
      await nav.goToChapterTopic(...topicA);
      expect(await playlist.cardTitles(), 'topic A Playlist intact').toEqual(titlesA);
      await nav.goToChapterTopic(...topicB);
      expect(await playlist.cardTitles(), 'topic B Playlist intact').toEqual(titlesB);
    }
  );
});
