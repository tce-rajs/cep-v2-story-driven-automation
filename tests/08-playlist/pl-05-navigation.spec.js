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

  test(
    'PL-05-03: the Playlist shows the same resources after the app reloads',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const before = await user.playlist.cardTitles();
      expect(before.length).toBeGreaterThan(0);
      await page.reload();
      await expect(user.login.avatar).toBeVisible({ timeout: 30000 });
      await user.playlist.ensureDrawerVisible();
      // Same resources, compared as a set: two same-titled cards can swap places on reload,
      // and card order is PL-09-02's concern.
      const sorted = (a) => [...a].sort();
      await expect
        .poll(async () => sorted(await user.playlist.cardTitles()), {
          message: 'same cards after reload',
          timeout: 20000,
        })
        .toEqual(sorted(before));
    }
  );

  test(
    "PL-05-04: switching topic never shows the previous topic's resources in the strip",
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const { nav, playlist } = user;
      await nav.goToChapterTopic(1, 0);
      const titlesB = await playlist.cardTitles();
      await nav.goToChapterTopic(0, 0);
      const titlesA = await playlist.cardTitles();
      const onlyA = titlesA.filter((t) => t && !titlesB.includes(t));
      expect(onlyA.length, 'set-up: topic A has resources topic B does not').toBeGreaterThan(0);

      await nav.goToChapterTopic(1, 0);
      // Watch the strip while topic B loads: once the label shows B, no card of topic A may be shown.
      const seen = new Set();
      const end = Date.now() + 6000;
      while (Date.now() < end) {
        const label = ((await nav.currentChapterTopicBtn.innerText().catch(() => '')) || '').trim();
        if (label.startsWith('2.1')) for (const t of await playlist.cardTitles()) if (onlyA.includes(t)) seen.add(t);
        await page.waitForTimeout(250);
      }
      expect([...seen], "no card of the previous topic shown on topic B's strip").toEqual([]);
      expect(await playlist.cardTitles(), "topic B's own strip").toEqual(titlesB);
    }
  );
});
