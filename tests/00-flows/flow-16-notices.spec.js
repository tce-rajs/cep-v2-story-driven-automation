// FLOW-16 — An AI notice from the board to the classes
// Source: CEPV2_Stories/00_EndToEndFlows.md. Writes only in fresh board space (the captured text box stays there; the
// board is never erased). FLOW-16-04 really sends ONE notice to the class the teacher is in, as AIN-03 already does;
// no other test sends (the send request is blocked or never pressed). FLOW-16-08 (received in Crystal) is a hand-off.

const { test, expect } = require('../../fixtures');

const isSend = (req) => req.method() === 'POST' && /noticeboard/i.test(req.url());
/** Every notice send request from now on. */
const watchSends = (page) => {
  const sends = [];
  page.on('request', (r) => isSend(r) && sends.push(r.url()));
  return sends;
};
/** Index of the class the teacher is in, in the composer's "Share with" list (-1 if it is not listed). */
const currentClassIndex = async (user) => {
  const current = (await user.whiteboard.currentClassBtn.innerText())
    .match(/Class\s*\d+\s*[A-Z]/i)[0]
    .replace(/\s+/g, '');
  const labels = (await user.aiNotices.classOptions.allInnerTexts()).map((t) => t.replace(/\s+/g, ''));
  return labels.findIndex((t) => t.toLowerCase() === current.toLowerCase());
};

test.use({ classMap: 'scratchBoard', freshSpace: true });

test.describe('FLOW-16 AI Notices from the board', () => {
  test.afterEach(async ({ user }) => {
    await user.aiNotices.closeAll();
  });

  test(
    'FLOW-16-01: capturing a part of the board puts its text into the notice',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await user.aiNotices.openComposer(user, 'Parents meeting on Saturday');
      await expect(user.aiNotices.bodyEditor, 'the board text is in the notice').toContainText(/parents meeting/i, {
        timeout: 15000,
      });
      await expect(user.aiNotices.titleInput, 'with an AI-written title').not.toHaveValue('');
    }
  );

  test('FLOW-16-02: the AI-written notice can be edited', { tag: ['@functional'] }, async ({ user, page }) => {
    const n = user.aiNotices;
    await n.openComposer(user, 'Science fair next week');
    const title = `Edited notice ${Date.now()}`;
    await n.titleInput.fill(title);
    await n.bodyEditor.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.type(' Bring your models.');
    await n.hideKeyboard();
    await expect(n.titleInput, 'the title is the teacher’s').toHaveValue(title);
    await expect(n.bodyEditor, 'the body keeps the teacher’s words').toContainText('Bring your models.');
  });

  test('FLOW-16-03: one or more classes can be chosen', { tag: ['@functional'] }, async ({ user }) => {
    const n = user.aiNotices;
    await n.openComposer(user);
    const total = await n.classOptions.count();
    expect(total, 'set-up: the teacher has more than one class to share with').toBeGreaterThan(1);
    await n.untickAllClasses();
    await n.classOption(0).click({ force: true });
    await expect(n.classCheckbox(0), 'one class chosen').toBeChecked();
    await n.classOption(1).click({ force: true });
    await expect(n.classCheckbox(1), 'a second class chosen').toBeChecked();
    await expect(n.classCheckbox(0), 'the first stays chosen').toBeChecked();
  });

  test('FLOW-16-04: sending shows a confirmation', { tag: ['@smoke', '@functional'] }, async ({ user, page }) => {
    const n = user.aiNotices;
    await n.openComposer(user, 'School closes early today');
    const mine = await currentClassIndex(user);
    expect(mine, 'set-up: the current class is offered').toBeGreaterThanOrEqual(0);
    await n.untickAllClasses();
    await n.classOption(mine).click({ force: true });
    await n.titleInput.fill(`AutoTest notice ${Date.now()}`);
    await n.hideKeyboard();
    const sent = page.waitForResponse((r) => isSend(r.request()), { timeout: 30000 });
    await n.sendBtn.click();
    expect((await sent).ok(), 'the notice is sent').toBe(true);
    await expect(
      n.snackbar.filter({ hasText: /sent|success|shared|published/i }).first(),
      'a confirmation'
    ).toBeVisible({
      timeout: 15000,
    });
  });

  test('FLOW-16-05: sending with no class chosen is not possible', { tag: ['@negative'] }, async ({ user, page }) => {
    const n = user.aiNotices;
    await n.openComposer(user);
    const sends = watchSends(page);
    // Block the send in case it goes out anyway: nothing must reach the students.
    await page.route('**/*', (route) => (isSend(route.request()) ? route.abort('blockedbyclient') : route.continue()));
    try {
      await n.untickAllClasses();
      await n.hideKeyboard();
      if (await n.sendBtn.isEnabled().catch(() => false)) await n.sendBtn.click({ force: true });
      await page.waitForTimeout(3000);
      expect(sends, 'no send request').toEqual([]);
    } finally {
      await page.unroute('**/*').catch(() => {});
    }
  });

  test(
    'FLOW-16-06: closing the composer without sending sends nothing',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const n = user.aiNotices;
      await n.openComposer(user, 'Holiday on Monday');
      const sends = watchSends(page);
      await n.close();
      await page
        .locator('mat-dialog-container button, [role="dialog"] button')
        .filter({ hasText: /discard|yes|confirm|close/i })
        .first()
        .click({ timeout: 2000 })
        .catch(() => {});
      await expect(n.titleInput, 'the composer is closed').toBeHidden({ timeout: 10000 });
      await page.waitForTimeout(3000);
      expect(sends, 'nothing was sent').toEqual([]);
    }
  );

  test(
    'FLOW-16-07: a network failure while sending shows a message and does not send twice',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const n = user.aiNotices;
      await n.openComposer(user, 'Exam timetable changed');
      await n.titleInput.fill(`AutoTest failed send ${Date.now()}`);
      await n.hideKeyboard();
      const sends = watchSends(page);
      await page.route('**/*', (route) =>
        isSend(route.request()) ? route.abort('internetdisconnected') : route.continue()
      );
      try {
        await n.sendBtn.click();
        await expect(
          page.getByText(/fail|error|could not|couldn.t|unable|try again|network|offline/i).first(),
          'a message that it was not sent'
        ).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(5000);
        expect(sends.length, 'one attempt, not two').toBe(1);
      } finally {
        await page.unroute('**/*').catch(() => {});
      }
    }
  );

  test(
    'FLOW-16-09: Hindi and Marathi text captured from the board appears in the notice as written',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const n = user.aiNotices;
      const text = 'कल विद्यालय बंद रहेगा';
      const box = await user.toolbar.wbSvg.boundingBox();
      const obj = await user.whiteboard.insertTextAndType(box.width / 2 - 300, box.height / 2, text);
      await page.mouse.click(box.x + 200, box.y + box.height - 250);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
      const t = await obj.boundingBox();
      await user.magnet.choose('notice');
      await n.captureBanner.waitFor({ state: 'visible', timeout: 10000 });
      await n.dragSelect(
        { x: 0, y: 0 },
        { x: t.x - 30, y: t.y - 30 },
        { x: t.x + t.width + 30, y: t.y + t.height + 30 }
      );
      await n.approveBtn.click({ force: true });
      await n.titleInput.waitFor({ state: 'visible', timeout: 30000 });
      await expect(n.bodyEditor, 'the notice body holds the Hindi text').toContainText('विद्यालय', { timeout: 15000 });
    }
  );

  test(
    'FLOW-16-10: the translate tool is visible and changes the notice text',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const n = user.aiNotices;
      await n.openComposer(user, 'parents meeting on saturday at ten');
      await n.hideKeyboard();
      const translate = page.locator('[data-qa-id="ai-notices-translate-btn"]');
      await expect(translate, 'the translate tool shows an icon or label').toHaveJSProperty('offsetWidth', 40);
      const iconShown = await translate.evaluate(
        (e) => !!(e.querySelector('img, svg, i, span')?.getBoundingClientRect().width || e.innerText.trim())
      );
      expect(iconShown, 'the translate button shows an icon or a label').toBe(true);
      const before = await n.bodyEditor.innerText();
      await n.bodyEditor.click();
      await page.keyboard.press('Control+A');
      await translate.click();
      await expect
        .poll(() => n.bodyEditor.innerText(), { message: 'the text changed', timeout: 20000 })
        .not.toBe(before);
    }
  );

  test(
    'FLOW-16-11: "Share with" ticks the class the teacher is in, and no other class',
    { tag: ['@functional'] },
    async ({ user }) => {
      const n = user.aiNotices;
      await n.openComposer(user);
      const current = (await user.whiteboard.currentClassBtn.innerText())
        .match(/Class\s*\d+\s*[A-Z]/i)[0]
        .replace(/\s+/g, '');
      const labels = (await n.classOptions.allInnerTexts()).map((x) => x.replace(/\s+/g, ''));
      const ticked = await n.classCheckboxes.evaluateAll((els) => els.map((e) => e.checked));
      const tickedLabels = labels.filter((_, i) => ticked[i]);
      expect(tickedLabels, `only the current class (${current}) is ticked`).toEqual([current]);
    }
  );
});
