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

  // The number of questions (AIH-03-01) and what they are about (AIH-03-08): one test each (split 2026-09-28).
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
      await hw.generate();
      await hw.waitForMathRendered();
      const texts = await hw.questions.allTextContents();
      // About the chapter in the header: its key words turn up across the questions.
      const words = chapter
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((w) => w.length > 4);
      const onTopic = texts.filter((t) => words.some((w) => t.toLowerCase().includes(w.slice(0, 6)))).length;
      test
        .info()
        .annotations.push({ type: 'note', description: `Chapter "${chapter}"; ${onTopic}/5 questions name it.` });
      expect(onTopic, `questions are about "${chapter}"`).toBeGreaterThanOrEqual(1); // questions rarely repeat the chapter title word for word
    }
  );

  test(
    "AIH-03-02: moving between the generated questions works, and going past the first or last doesn't wrap or error",
    { tag: ['@functional'] },
    async ({ user, page }) => {
      // CONFIRMED LIVE (2026-09-26, v 0.0.232): the builder lists every generated question in one scrolling column (its
      // per-question swipe arrows exist in the page but are never shown). So "moving between questions" is scrolling that
      // list: every question can be brought into view, first to last and back, with no error.
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      const hw = user.aiHomework;
      await hw.generate();
      const n = hw.questions;
      await expect(n).toHaveCount(5);
      for (const i of [n - 1, 0, n - 1]) {
        await hw.questions.nth(i).scrollIntoViewIfNeeded();
        await expect(hw.questions.nth(i), `question ${i + 1} reachable`).toBeInViewport();
      }
      await expect(hw.questions, 'still five, nothing duplicated or wrapped').toHaveCount(5);
      expect(errors).toEqual([]);
    }
  );

  // CONFIRMED LIVE (2026-09-26): Regenerate is one button for the whole set (no per-question regenerate is shown, so the
  // story's "a single question" is the whole set here). Split 2026-09-28: Regenerate replaces the questions (AIH-03-03),
  // and the new ones survive Next -> Previous (AIH-03-07).
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

  test.fixme("AIH-03-04: removing a generated question doesn't leave a blank question behind (regression, Zoho TCN-I15460)", async () => {
    // STORY vs APP, CONFIRMED LIVE (2026-09-26, v 0.0.232): there is no way to remove a single question in the builder --
    // no remove control, the per-question swipe/drag icons are never shown, and dragging a question sideways does nothing.
    // Unblock: a build with question removal (the Zoho ticket's flow), or check it by hand on a touch screen.
  });

  test(
    'AIH-03-05: double-clicking Generate starts only one generation (regression)',
    { tag: ['@bug', '@regression'] },
    async ({ user, page }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232): a double-click on Generate sends TWO
      // POST .../hive-proxy/tce-school-api/1/api/v1/rag/worksheet requests (two AI generations for one click).
      test.fail(true, 'Double-clicking Generate starts two AI generation requests');
      const hw = user.aiHomework;
      const calls = [];
      page.on('request', (r) => {
        if (r.method() === 'POST' && /rag|worksheet|generate/i.test(r.url())) calls.push(r.url());
      });
      await hw.generateBtn.dblclick();
      await hw.questions.first().waitFor({ state: 'attached', timeout: 90000 });
      await page.waitForTimeout(3000);
      expect(calls, `one generation request (saw ${calls.length})`).toHaveLength(1);
      await expect(hw.questions).toHaveCount(5);
    }
  );

  test(
    'AIH-03-06: generated question text shows no stray "$" symbols (regression, Zoho TCN-I15320)',
    { tag: ['@regression'] },
    async ({ user }) => {
      const hw = user.aiHomework;
      await hw.generate();
      // The raw LaTeX ($...$) is typeset about 2 s after the questions appear; judge the text once that has happened.
      await hw.waitForMathRendered();
      const texts = await hw.questions.allTextContents();
      texts.forEach((t, i) => expect(t, `question ${i + 1}`).not.toMatch(/\$/));
    }
  );
});
