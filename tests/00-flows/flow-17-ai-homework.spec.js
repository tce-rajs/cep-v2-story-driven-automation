// FLOW-17 — AI Homework from building to assigning
// Source: CEPV2_Stories/00_EndToEndFlows.md
// Data: 'aiHomework' (Class 10A Science 1.1), where the builder can generate. Generation is a real AI call (20-30 s);
// the count is set to 5 to keep it short. FLOW-17-05 really assigns ONE homework to Class 10A, as AIH-04-06 already
// does; no other test assigns. FLOW-17-09 (every class) is in flow-17-19-every-class.spec.js; FLOW-17-08 (received in
// Crystal) is a hand-off.

const { test, expect } = require('../../fixtures');
const { getClassMap } = require('../../config/moduleClassMap');

const HW = getClassMap('aiHomework');
const isGenerate = (req) => req.method() === 'POST' && /rag\/worksheet/i.test(req.url());
const isAssign = (req) =>
  ['POST', 'PUT'].includes(req.method()) && /assign|homework/i.test(req.url()) && !/rag/i.test(req.url());

test.use({ classMap: 'aiHomework' });

test.describe('FLOW-17 AI Homework from building to assigning', () => {
  test.describe.configure({ timeout: 300000 });

  test.afterEach(async ({ app }) => {
    await app.page.unroute('**/*').catch(() => {});
    await app.aiHomework.closeAll();
  });

  /** Open the builder with 5 objective questions and generate them. */
  const generateFive = async (user) => {
    const hw = user.aiHomework;
    await hw.open(user.magnet);
    await hw.setHomeworkCount(5);
    await hw.generate();
    await hw.waitForMathRendered();
  };

  test(
    'FLOW-17-01: the homework builder opens for the current topic',
    { tag: ['@smoke', '@functional'] },
    async ({ user, page }) => {
      const topic = (await user.nav.currentChapterTopicBtn.innerText()).replace(/\s+/g, ' ');
      const chapterNo = topic.match(/^(\d+)\./)?.[1];
      await user.aiHomework.open(user.magnet);
      const header = page
        .getByText(new RegExp(`${HW.grade.replace(/\s+/g, '\\s*')}\\s*\\|\\s*${HW.subject}`, 'i'))
        .first();
      await expect(header, 'the builder is for the current class and subject').toBeVisible({ timeout: 10000 });
      if (chapterNo)
        await expect(header.locator('xpath=..'), 'and the current topic’s chapter').toContainText(
          new RegExp(`Chapter\\s*${chapterNo}\\b|\\b${chapterNo}\\.`)
        );
    }
  );

  test(
    'FLOW-17-02: the chosen type and number of questions are generated',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const hw = user.aiHomework;
      await hw.open(user.magnet);
      await expect(hw.homeworkCard, 'the Homework type is chosen').toBeVisible();
      await hw.setHomeworkCount(5);
      await hw.generate();
      await hw.waitForMathRendered();
      await expect(hw.questions, 'five questions').toHaveCount(5);
      for (const t of await hw.questions.allTextContents())
        expect(t.trim().length, 'each question has text').toBeGreaterThan(10);
    }
  );

  test('FLOW-17-03: the generated questions belong to the topic', { tag: ['@functional'] }, async ({ user }) => {
    const hw = user.aiHomework;
    await hw.open(user.magnet);
    const chapter = await hw.headerChapter();
    const topic = (await user.nav.currentChapterTopicBtn.innerText()).replace(/^[\d.\s|]+/, '').trim();
    await hw.setHomeworkCount(5);
    await hw.generate();
    await hw.waitForMathRendered();
    const words = `${chapter} ${topic}`
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length > 4);
    const texts = await hw.questions.allTextContents();
    const onTopic = texts.filter((t) => words.some((w) => t.toLowerCase().includes(w.slice(0, 6)))).length;
    test.info().annotations.push({ type: 'note', description: `"${chapter}" / "${topic}": ${onTopic}/5 name them.` });
    expect(onTopic, `the questions are about "${chapter}"`).toBeGreaterThanOrEqual(1);
  });

  test(
    'FLOW-17-04: a question can be changed or removed before assigning',
    { tag: ['@functional'] },
    async ({ user }) => {
      const hw = user.aiHomework;
      await generateFive(user);
      await expect(hw.deleteQuestionBtns.first(), 'each question offers a remove control').toBeVisible({
        timeout: 10000,
      });
      await hw.deleteQuestionBtns.first().click();
      await user.page
        .locator('mat-dialog-container button, [role="dialog"] button')
        .filter({ hasText: /yes|delete|remove|confirm/i })
        .first()
        .click({ timeout: 2000 })
        .catch(() => {});
      await expect(hw.questions, 'the question is removed').toHaveCount(4, { timeout: 10000 });
      await hw.goToAssign();
      await hw.assignPreviousBtn.click({ force: true });
      await expect(hw.questions, 'the change is kept until assigning').toHaveCount(4, { timeout: 10000 });
    }
  );

  test(
    'FLOW-17-05: homework can be assigned to chosen classes with a due date',
    { tag: ['@smoke', '@functional'] },
    async ({ user, page }) => {
      const hw = user.aiHomework;
      await generateFive(user);
      await hw.goToAssign();
      await hw.hideKeyboard();
      const mine = `${HW.grade}${HW.division}`.replace(/\s+/g, '').toLowerCase();
      const labels = (await hw.assignClassOptions.allInnerTexts()).map((t) => t.replace(/\s+/g, '').toLowerCase());
      const index = labels.findIndex((t) => t.includes(mine));
      expect(index, `set-up: ${HW.grade} ${HW.division} is offered`).toBeGreaterThanOrEqual(0);
      // Only this class (a real assignment goes to it), due in 2 days.
      for (let i = 0; i < labels.length; i++)
        if ((await hw.assignClassCheckbox(i).isChecked()) !== (i === index))
          await hw.assignClassOption(i).click({ force: true });
      await hw.assignDueOption(1).click();
      await expect(hw.assignDueRadio(1), 'the due date is chosen').toBeChecked();
      await hw.assignTitleInput.fill(`AutoTest homework ${Date.now()}`);
      await hw.hideKeyboard();
      const sent = page.waitForResponse((r) => isAssign(r.request()), { timeout: 30000 });
      await hw.assignSendBtn.click();
      expect((await sent).ok(), 'the homework is assigned').toBe(true);
      await expect(hw.snackbar.first(), 'a confirmation').toContainText(/sent|success|assigned|shared/i, {
        timeout: 20000,
      });
    }
  );

  test('FLOW-17-06: assigning with no class chosen is not possible', { tag: ['@negative'] }, async ({ user, page }) => {
    const hw = user.aiHomework;
    await generateFive(user);
    await hw.goToAssign();
    await hw.hideKeyboard();
    const assigns = [];
    page.on('request', (r) => isAssign(r) && assigns.push(r.url()));
    await page.route('**/*', (route) =>
      isAssign(route.request()) ? route.abort('blockedbyclient') : route.continue()
    );
    for (let i = 0; i < (await hw.assignClassOptions.count()); i++)
      if (await hw.assignClassCheckbox(i).isChecked()) await hw.assignClassOption(i).click({ force: true });
    if (await hw.assignSendBtn.isEnabled().catch(() => false)) await hw.assignSendBtn.click({ force: true });
    await page.waitForTimeout(3000);
    expect(assigns, 'nothing is assigned with no class chosen').toEqual([]);
  });

  test(
    'FLOW-17-07: an AI or network failure shows a message and keeps what was built',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const hw = user.aiHomework;
      await generateFive(user);
      const built = await hw.questions.allTextContents();
      await page.route('**/*', (route) =>
        isGenerate(route.request()) ? route.abort('internetdisconnected') : route.continue()
      );
      await hw.regenerateBtn.or(hw.generateBtn).first().click();
      await page
        .locator('mat-dialog-container button, [role="dialog"] button')
        .filter({ hasText: /yes|regenerate|confirm|ok/i })
        .first()
        .click({ timeout: 2000 })
        .catch(() => {});
      await expect(
        page.getByText(/fail|error|could not|couldn.t|unable|try again|network|something went wrong/i).first(),
        'a message that it failed'
      ).toBeVisible({ timeout: 30000 });
      await page.unroute('**/*');
      expect(await hw.questions.allTextContents(), 'the questions already built are kept').toEqual(built);
    }
  );

  test(
    'FLOW-17-10: the chapter in the homework builder is the chapter of the topic the teacher is on',
    { tag: ['@functional'] },
    async ({ user }) => {
      // The teacher's chapter, by name, from the Chapters popup (the current topic's chapter is the current one).
      const topic = (await user.nav.currentChapterTopicBtn.innerText()).replace(/\s+/g, ' ').trim();
      await user.nav.openChaptersPopup();
      await user.nav.chapterItems.first().waitFor({ state: 'visible', timeout: 10000 });
      const current = user.nav.chapterItems.filter({ has: user.page.locator('.active, .selected') });
      const name = (
        (await current.count())
          ? await current.first().innerText()
          : await user.nav.chapterItems.nth(HW.chapterIndex).innerText()
      )
        .replace(/\s+/g, ' ')
        .replace(/^(chapter\s*)?\d+\s*[.:]?\s*/i, '')
        .trim();
      await user.nav._closeChaptersPopupIfOpen();
      await user.aiHomework.open(user.magnet);
      const builder = await user.aiHomework.headerChapter();
      test
        .info()
        .annotations.push({ type: 'note', description: `Topic "${topic}", chapter "${name}", builder "${builder}"` });
      expect(builder.toLowerCase(), 'the builder names the teacher’s chapter').toBe(name.toLowerCase());
    }
  );
});
