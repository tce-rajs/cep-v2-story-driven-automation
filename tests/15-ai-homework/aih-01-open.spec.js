// AIH-01 — Open the homework builder
// Source: CEPV2_Stories/15_AIHomework.md
// Data: 'aiHomework' (config/moduleClassMap.js) is a class the AI supports. History in Class 11 is unsupported.

const { test, expect } = require('../../fixtures');
const { getClassMap } = require('../../config/moduleClassMap');

const HW = getClassMap('aiHomework');

test.use({ classMap: 'aiHomework' });

test.describe('AIH-01 Open the homework builder', () => {
  test.afterEach(async ({ app }) => {
    await app.aiHomework.closeAll();
    await app.aiNotices.closeAll();
  });

  test(
    'AIH-01-01: Magnet → Homework opens the builder with its cards, counters, Select Chapter and Generate',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const hw = user.aiHomework;
      await hw.open(user.magnet);
      await expect(hw.homeworkCard).toBeVisible();
      await expect(hw.reviseCard).toBeVisible();
      await expect(hw.hwObjInput).toBeVisible();
      await expect(hw.selectChapterBtn).toBeVisible();
      await expect(hw.generateBtn).toBeVisible();
    }
  );

  test(
    "AIH-01-02: the builder's header shows the current class, subject and chapter",
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const hw = user.aiHomework;
      const chapterTopic = (await user.whiteboard.currentChapterTopicBtn.innerText()).replace(/\s+/g, ' ');
      const chapterNo = chapterTopic.match(/^(\d+)\./)?.[1] || chapterTopic.match(/(\d+)\.\d+/)?.[1];
      await hw.open(user.magnet);
      const header = page
        .getByText(new RegExp(`${HW.grade.replace(/\s+/g, '\\s*')}\\s*\\|\\s*${HW.subject}`, 'i'))
        .first();
      await expect(header, 'class and subject in the header').toBeVisible({ timeout: 10000 });
      // The header names the chapter as "Chapter 2: ..." (or "2. ...").
      if (chapterNo)
        await expect(header.locator('xpath=..')).toContainText(
          new RegExp(`Chapter\\s*${chapterNo}\\b|\\b${chapterNo}\\.`)
        );
    }
  );

  test(
    'AIH-01-03: an unsupported subject shows the "grade or class seems incorrect" message and does not generate',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      await user.nav.resetToClass('Class 11', 'A', 'History');
      const hw = user.aiHomework;
      await hw.open(user.magnet);
      await expect(hw.wrongSubjectBanner).toBeVisible({ timeout: 15000 });
      if (await hw.generateBtn.isEnabled().catch(() => false)) await hw.generateBtn.click();
      await page.waitForTimeout(8000);
      await expect(hw.questions, 'no questions generated').toHaveCount(0);
    }
  );

  test(
    'AIH-01-04: opening and closing the builder 5 times leaves exactly one clean builder',
    { tag: ['@edge'] },
    async ({ user }) => {
      const hw = user.aiHomework;
      for (let i = 0; i < 5; i++) {
        await hw.open(user.magnet);
        await hw.discardBtn.click({ force: true });
        await expect(hw.selectChapterBtn).toBeHidden({ timeout: 10000 });
      }
      await hw.open(user.magnet);
      await expect(hw.selectChapterBtn, 'exactly one builder').toHaveCount(1);
      await expect(hw.hwObjInput).toHaveValue('15');
    }
  );
});
