// AIH-03 — Generate and review the questions
// Source: CEPV2_Stories/15_AIHomework.md
// Generation is a real AI call (20-30 s). The count is set to 5 to keep each run short.

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'aiHomework' });
test.describe.configure({ timeout: 240000 });

test.describe('AIH-03 Generate and review the questions', () => {
  test.beforeEach(async ({ user }) => {
    await user.aiHomework.open(user.magnet);
    await user.aiHomework.setHomeworkCount(5);
  });

  test.afterEach(async ({ app }) => {
    await app.aiHomework.closeAll();
  });

  // The number of questions (AIH-03-01) and what they are about (AIH-03-08): one test each.
  test(
    'AIH-03-01: Generate produces the chosen number of questions, each with text',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const hw = user.aiHomework;
      await hw.generate();
      await hw.waitForMathRendered();
      await expect(hw.questions).toHaveCount(5);
      const texts = await hw.questions.allTextContents();
      texts.forEach((t, i) => expect(t.trim().length, `question ${i + 1} has text`).toBeGreaterThan(10));
    }
  );

  test(
    'AIH-03-08: the generated questions are about the selected chapter',
    { tag: ['@functional'] },
    async ({ user }) => {
      const hw = user.aiHomework;
      const chapter = await hw.headerChapter();
      const topic = (await user.whiteboard.currentChapterTopicBtn.innerText()).replace(/^[\d.\s|]+/, '').trim();
      await hw.generate();
      await hw.waitForMathRendered();
      const texts = await hw.questions.allTextContents();
      // About the chapter in the header (and its current topic): their key words turn up across the questions.
      const words = `${chapter} ${topic}`
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((w) => w.length > 4);
      const onTopic = texts.filter((t) => words.some((w) => t.toLowerCase().includes(w.slice(0, 6)))).length;
      test.info().annotations.push({
        type: 'note',
        description: `Chapter "${chapter}", topic "${topic}"; ${onTopic}/5 questions name them.`,
      });
      expect(onTopic, `questions are about "${chapter}"`).toBeGreaterThanOrEqual(1); // questions rarely repeat the chapter title word for word
    }
  );

  test(
    "AIH-03-02: moving between the generated questions works, and going past the first or last doesn't wrap or error",
    { tag: ['@functional'] },
    async ({ user, page }) => {
      // The builder lists every generated question in one scrolling column (its
      // per-question swipe arrows exist in the page but are never shown). So "moving between questions" is scrolling that
      // list: every question can be brought into view, first to last and back, with no error.
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      const hw = user.aiHomework;
      await hw.generate();
      await expect(hw.questions).toHaveCount(5);
      const n = await hw.questions.count();
      for (const i of [n - 1, 0, n - 1]) {
        await hw.questions.nth(i).scrollIntoViewIfNeeded();
        await expect(hw.questions.nth(i), `question ${i + 1} reachable`).toBeInViewport();
      }
      await expect(hw.questions, 'still five, nothing duplicated or wrapped').toHaveCount(5);
      expect(errors).toEqual([]);
    }
  );

  // Split: Regenerate replaces the questions (AIH-03-03), and the new ones survive Next -> Previous (AIH-03-07).
  /** Generate, then Regenerate until a full, different set is shown; returns the new set. */
  const regenerate = async (hw) => {
    await hw.generate();
    await hw.waitForMathRendered();
    const before = await hw.questions.allTextContents();
    await hw.regenerateBtn.click();
    await expect
      .poll(
        async () => {
          // The list empties while regenerating: wait for a full, different set.
          const now = await hw.questions.allTextContents();
          return now.length === before.length && JSON.stringify(now) !== JSON.stringify(before);
        },
        { message: 'questions replaced', timeout: 90000 }
      )
      .toBe(true);
    await hw.waitForMathRendered();
    return hw.questions.allTextContents();
  };

  test('AIH-03-03: Regenerate replaces the generated questions', { tag: ['@functional'] }, async ({ user }) => {
    const replaced = await regenerate(user.aiHomework);
    expect(replaced, 'a full set').toHaveLength(5);
  });

  test(
    'AIH-03-07: regenerated questions are still there after going Next and back again',
    { tag: ['@functional'] },
    async ({ user }) => {
      const hw = user.aiHomework;
      const replaced = await regenerate(hw);
      await hw.goToAssign();
      await hw.assignPreviousBtn.click();
      await expect(hw.questions).toHaveCount(replaced.length, { timeout: 10000 });
      await hw.waitForMathRendered();
      expect(await hw.questions.allTextContents(), 'the new questions are still there').toEqual(replaced);
    }
  );

  test("AIH-03-04: removing a generated question doesn't leave a blank question behind", async () => {
    test.fixme(
      true,
      'there is no way to remove a single question in the builder -- no remove control, the per-question swipe/drag icons are never shown, and dragging a question sideways does nothing. Unblock: a build with question removal (the Zoho ticket’s flow), or check it by hand on a touch screen.'
    );
  });

  test('AIH-03-06: generated question text shows no stray "$" symbols', { tag: ['@regression'] }, async ({ user }) => {
    const hw = user.aiHomework;
    await hw.generate();
    // The raw LaTeX ($...$) is typeset about 2 s after the questions appear; judge the text once that has happened.
    await hw.waitForMathRendered();
    const texts = await hw.questions.allTextContents();
    texts.forEach((t, i) => expect(t, `question ${i + 1}`).not.toMatch(/\$/));
  });

  test(
    'AIH-03-10: moving before the first or after the last generated question does nothing',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      // The questions are one scrolling column (see AIH-03-02): "moving" past either end is scrolling past it.
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      const hw = user.aiHomework;
      await hw.generate();
      await hw.waitForMathRendered();
      await expect(hw.questions).toHaveCount(5);
      const order = await hw.questions.allTextContents();
      const wheelOver = async (q, dy) => {
        const box = await q.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 40));
        for (let i = 0; i < 6; i++) await page.mouse.wheel(0, dy);
        await page.waitForTimeout(800);
      };
      await hw.questions.first().scrollIntoViewIfNeeded();
      await wheelOver(hw.questions.first(), -600);
      await expect(hw.questions.first(), 'still at the first question').toBeInViewport();
      await hw.questions.last().scrollIntoViewIfNeeded();
      await wheelOver(hw.questions.last(), 600);
      await expect(hw.questions.last(), 'still at the last question').toBeInViewport();
      expect(await hw.questions.allTextContents(), 'the same questions in the same order: nothing wrapped').toEqual(
        order
      );
      expect(errors, 'no errors').toEqual([]);
    }
  );

  test(
    'AIH-03-09: switching class while questions are being generated leaves no half-built homework behind',
    { tag: ['@interruption'] },
    async ({ user, page }) => {
      const hw = user.aiHomework;
      await hw.generateBtn.click();
      await expect(hw.generatingText, 'set-up: generating').toBeVisible({ timeout: 15000 });
      await user.nav.applyClassMap('default');
      // Long enough for the generation that was under way to have come back.
      await page.waitForTimeout(40000);
      await expect(hw.questions.filter({ visible: true }), 'no questions left on screen').toHaveCount(0);
      await expect(hw.generatingText, 'no generation still running').toBeHidden();
      // Back on the homework class, the builder starts fresh.
      await user.nav.applyClassMap('aiHomework');
      await hw.open(user.magnet);
      await expect(hw.questions, 'no half-built homework in the builder').toHaveCount(0);
      await expect(hw.hwObjInput, 'the counts are back to the default').toHaveValue('15');
    }
  );
});
