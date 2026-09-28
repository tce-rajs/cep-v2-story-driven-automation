// AIH-02 — Choose the homework type and number of questions
// Source: CEPV2_Stories/15_AIHomework.md

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'aiHomework' });

test.describe('AIH-02 Choose the homework type and number of questions', () => {
  test.beforeEach(async ({ user }) => {
    await user.aiHomework.open(user.magnet);
  });

  test.afterEach(async ({ app }) => {
    await app.aiHomework.closeAll();
  });

  test(
    'AIH-02-01: Homework is the default with 15 objective questions; Revise offers 10 objective and 5 subjective',
    { tag: ['@functional'] },
    async ({ user }) => {
      const hw = user.aiHomework;
      await expect(hw.homeworkCard).toHaveClass(/select|active|checked/i);
      await expect(hw.hwObjInput).toHaveValue('15');
      await expect(hw.revObjInput).toHaveValue('10');
      await expect(hw.revSubjInput).toHaveValue('5');
      await hw.reviseCard.click();
      await expect(hw.reviseCard, 'Revise can be selected').toHaveClass(/select|active|checked/i);
    }
  );

  test(
    'AIH-02-02: the + and − buttons change a count by one each click',
    { tag: ['@functional'] },
    async ({ user }) => {
      const hw = user.aiHomework;
      await hw.hwObjPlus.click();
      await expect(hw.hwObjInput).toHaveValue('16');
      await hw.hwObjMinus.click();
      await hw.hwObjMinus.click();
      await expect(hw.hwObjInput).toHaveValue('14');
    }
  );

  test(
    'AIH-02-03: a fast double-click on + adds two questions (regression)',
    { tag: ['@regression'] },
    async ({ user }) => {
      const hw = user.aiHomework;
      await hw.hwObjPlus.dblclick();
      await expect(hw.hwObjInput).toHaveValue('17');
    }
  );

  test(
    'AIH-02-04: clicking + and − alternately 20 times returns the count to where it started',
    { tag: ['@edge'] },
    async ({ user }) => {
      const hw = user.aiHomework;
      for (let i = 0; i < 10; i++) {
        await hw.hwObjPlus.click();
        await hw.hwObjMinus.click();
      }
      await expect(hw.hwObjInput).toHaveValue('15');
    }
  );

  test(
    'AIH-02-05: the lowest allowed count still generates exactly that many questions',
    { tag: ['@edge'] },
    async ({ user }) => {
      test.setTimeout(180000);
      const hw = user.aiHomework;
      for (let i = 0; i < 20; i++) await hw.hwObjMinus.click();
      let lowest = await hw.count(hw.hwObjInput);
      if (lowest === 0) {
        // Zero questions can't be generated; the lowest generating count is 1.
        await hw.hwObjPlus.click();
        lowest = 1;
      }
      await hw.generate();
      await expect(hw.questions).toHaveCount(lowest);
    }
  );

  test(
    "AIH-02-06: Select Chapter changes the chapter shown in the builder's header",
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const hw = user.aiHomework;
      await hw.selectChapterBtn.click();
      await expect(hw.topicsChapters.first()).toBeVisible({ timeout: 10000 });
      const target = hw.topicsChapter(2);
      const name = (await target.innerText()).trim();
      await target.click();
      await hw.topicsUpdateBtn.click();
      await expect(
        page.getByText(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 25))).first(),
        `header shows "${name}"`
      ).toBeVisible({
        timeout: 10000,
      });
    }
  );
});
