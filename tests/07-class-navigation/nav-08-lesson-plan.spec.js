// NAV-08 — Topic lesson plan
// Source: CEPV2_Stories/07_ClassNavigation.md
// In the Chapters popup each topic has a document icon (playlist-tp-lesson-plan-btn) that opens its lesson plan over
// the board: "Chapter N: <chapter>", the topic name, then OBJECTIVES, INTRODUCTION and the other sections.

const { test, expect } = require('../../fixtures');

/** Open the lesson plan of topic `topicIndex` in chapter `chapterIndex`; returns that topic's name. */
const openLessonPlan = async (user, chapterIndex, topicIndex) => {
  await user.nav.showTopicsOf(chapterIndex);
  const topic = user.nav.topicItems.nth(topicIndex);
  const name = (await topic.innerText())
    .replace(/^article\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  await topic.locator('[data-qa-id="playlist-tp-lesson-plan-btn"]').click({ force: true });
  await expect(user.nav.lessonPlan, 'set-up: the lesson plan opened').toBeVisible({ timeout: 15000 });
  return name;
};
/** Close the lesson plan the way a teacher does: tap somewhere else (the header clock). */
const closeLessonPlan = async (user) => {
  await user.header.calendar.click({ force: true });
  await expect(user.nav.lessonPlan, 'the lesson plan closed').toBeHidden({ timeout: 5000 });
};
const currentTopic = async (user) => (await user.nav.currentChapterTopicBtn.innerText()).replace(/\s+/g, ' ').trim();

// The board check compares only what is on fresh space (the teacher's existing writing is set aside).
test.use({ freshSpace: true });

test.describe('NAV-08 Topic lesson plan', () => {
  test.describe.configure({ timeout: 180000 });
  test(
    "NAV-08-01: the document icon next to a topic opens that topic's lesson plan",
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await openLessonPlan(user, 0, 0);
      await expect(user.nav.lessonPlan).toContainText(/chapter/i);
      await closeLessonPlan(user);
    }
  );

  test(
    'NAV-08-02: the lesson plan shows the chapter and topic names of the icon clicked, not the current topic',
    { tag: ['@functional'] },
    async ({ user }) => {
      const name = await openLessonPlan(user, 1, 0);
      const short = name.replace(/^\d+(\.\d+)?\s*\|?\s*/, '').slice(0, 25);
      await expect(user.nav.lessonPlan, 'the clicked topic').toContainText(short);
      await closeLessonPlan(user);
    }
  );

  test(
    'NAV-08-03: the lesson plan shows its sections (Objectives, Introduction)',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openLessonPlan(user, 0, 0);
      for (const section of [/objectives/i, /introduction/i])
        await expect(user.nav.lessonPlan, `section ${section}`).toContainText(section);
      await closeLessonPlan(user);
    }
  );

  test('NAV-08-04: a long lesson plan scrolls to its end', { tag: ['@functional'] }, async ({ user }) => {
    await openLessonPlan(user, 0, 0);
    const scrolled = await user.nav.lessonPlan.evaluate((root) => {
      const box = [root, ...root.querySelectorAll('*')].find((el) => el.scrollHeight > el.clientHeight + 20);
      if (!box) return { scrollable: false, atEnd: true };
      box.scrollTop = box.scrollHeight;
      return { scrollable: true, atEnd: box.scrollTop + box.clientHeight >= box.scrollHeight - 2 };
    });
    expect(scrolled.atEnd, 'the end of the plan can be reached').toBe(true);
    await closeLessonPlan(user);
  });

  test(
    'NAV-08-05: closing the lesson plan returns to the board with the topic and board unchanged',
    { tag: ['@functional'] },
    async ({ user }) => {
      const topic = await currentTopic(user);
      const board = await user.content.pathGeometry();
      await openLessonPlan(user, 0, 0);
      await closeLessonPlan(user);
      expect(await currentTopic(user), 'same topic').toBe(topic);
      expect(await user.content.pathGeometry(), 'board unchanged').toEqual(board);
    }
  );

  test(
    'NAV-08-06: opening a lesson plan does not switch the current topic',
    { tag: ['@negative'] },
    async ({ user }) => {
      // Another topic of the current chapter (opening a different chapter's list switches chapter by design).
      const topic = await currentTopic(user);
      await openLessonPlan(user, 0, 1);
      await closeLessonPlan(user);
      expect(await currentTopic(user), 'the current topic is unchanged').toBe(topic);
    }
  );

  test(
    'NAV-08-07: opening lesson plans of three topics one after another always shows the one clicked',
    { tag: ['@edge'] },
    async ({ user }) => {
      for (const [chapter, topic] of [
        [0, 0],
        [1, 0],
        [2, 0],
      ]) {
        const name = await openLessonPlan(user, chapter, topic);
        const short = name.replace(/^\d+(\.\d+)?\s*\|?\s*/, '').slice(0, 25);
        await expect(user.nav.lessonPlan, `the plan of "${name}"`).toContainText(short);
        await closeLessonPlan(user);
      }
    }
  );
});
