// AIH-01 — Open the homework builder
// Source: CEPV2_Stories/15_AIHomework.md
// Data: 'aiHomework' = Class 11A Mathematics (a supported subject). History on the same class is unsupported.

const { test, expect } = require('../../fixtures');

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
      const header = page.getByText(/Class\s*11\s*\|\s*Mathematics/i).first();
      await expect(header, 'class and subject in the header').toBeVisible({ timeout: 10000 });
      if (chapterNo) await expect(header.locator('xpath=..')).toContainText(new RegExp(`${chapterNo}\\.`));
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

  test(
    'AIH-01-05: opening Homework while another Magnet panel is open does not leave two Magnet panels open (regression, Zoho TCN-I15361)',
    { tag: ['@bug', '@regression'] },
    async ({ user, page }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232; Zoho TCN-I15361, still open): with Notice capture active,
      // Magnet -> Homework also opens the builder, so two Magnet panels are open at once.
      test.fail(true, 'Homework opens on top of an active Notice capture (two Magnet panels at once)');
      await user.magnet.choose('notice');
      await expect(user.aiNotices.captureBanner).toBeVisible({ timeout: 10000 });
      await user.magnet.tool.click({ force: true });
      await page.waitForTimeout(800);
      await user.magnet.homeworkItem.click({ force: true, timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2500);
      const open = [
        await user.aiHomework.selectChapterBtn.isVisible().catch(() => false),
        await user.aiNotices.captureBanner.isVisible().catch(() => false),
      ];
      expect(open.filter(Boolean).length, 'at most one Magnet panel open').toBeLessThanOrEqual(1);
    }
  );
});
