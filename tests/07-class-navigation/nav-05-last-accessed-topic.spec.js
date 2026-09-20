// NAV-05 — Last-accessed topic is restored
// Source: CEPV2_Stories/07_ClassNavigation.md
// Not automated (per PROCESS.md, Plan Mode is manual-only): NAV-05-03, NAV-05-04.
// This is only about WHERE the app puts the user back — not whether the whiteboard content survived (WB-06).

const { test, expect } = require('../../fixtures');

const where = async (user) => ({
  cls: ((await user.nav.currentClassBtn.innerText()) || '').replace(/\s+/g, ' ').trim(),
  topic: ((await user.nav.currentChapterTopicBtn.innerText()) || '').replace(/\s+/g, ' ').trim(),
});

test.describe('NAV-05 Last-accessed topic is restored', () => {
  test.beforeEach(async ({ user }) => {
    // A deliberately non-default spot: Class 9A Hindi, chapter 3, topic 1 (or 0 if the chapter has one topic).
    await user.nav.resetToClass('Class 9', 'A', 'Hindi Language');
    // Chapter 3, second topic (goToChapterTopic handles the popup closing itself after a chapter is picked).
    await user.nav.goToChapterTopic(2, 1);
  });

  test(
    'NAV-05-01: signing out and back in IMMEDIATELY returns the user to the exact topic they were on',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const before = await where(user);
      await user.userMenu.signOut();
      await user.signIn();

      await expect(user.nav.currentClassBtn).toBeVisible();
      expect(await where(user), 'landed on the same class and topic').toEqual(before);
    }
  );

  test(
    'NAV-05-02: signing out and back in AFTER SOME TIME still returns the user to the same topic',
    { tag: ['@long', '@functional'] },
    async ({ user }) => {
      const waitMinutes = Number(process.env.NAV_RESTORE_WAIT_MINUTES || 3);
      test.setTimeout((waitMinutes + 4) * 60 * 1000);

      const before = await where(user);
      await user.userMenu.signOut();
      await user.page.waitForTimeout(waitMinutes * 60 * 1000);
      await user.signIn();

      await expect(user.nav.currentClassBtn).toBeVisible();
      expect(await where(user), `landed on the same class and topic after ${waitMinutes} min`).toEqual(before);
    }
  );
});
