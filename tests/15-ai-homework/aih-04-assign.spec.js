// AIH-04 — Assign the homework to classes
// Source: CEPV2_Stories/15_AIHomework.md
// Ready to Send is real: it assigns homework to Class 11 A (owner-approved 2026-09-26). The count is set to 5 to keep
// generation short.

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'aiHomework' });
test.describe.configure({ timeout: 240000 });

test.describe('AIH-04 Assign the homework to classes', () => {
  test.beforeEach(async ({ user }) => {
    const hw = user.aiHomework;
    await hw.open(user.magnet);
    await hw.setHomeworkCount(5);
    await hw.generate();
    await hw.goToAssign();
    // The assign form focuses the title, which opens the on-screen keyboard over Discard / Ready to Send.
    await hw.hideKeyboard();
  });

  test.afterEach(async ({ app }) => {
    await app.aiHomework.closeAll();
  });

  test(
    'AIH-04-01: Next opens the form with a pre-filled title, the current class ticked, and "Due in" 1 day',
    { tag: ['@functional'] },
    async ({ user }) => {
      const hw = user.aiHomework;
      expect((await hw.assignTitleInput.inputValue()).trim(), 'title pre-filled').toMatch(/homework/i);
      const labels = (await hw.assignClassOptions.allInnerTexts()).map((t) => t.replace(/\s+/g, ''));
      const index = labels.findIndex((t) => /class11a/i.test(t));
      expect(index, 'Class 11 A listed').toBeGreaterThanOrEqual(0);
      await expect(hw.assignClassCheckbox(index)).toBeChecked();
      await expect(hw.assignDueRadio(0), '"Due in" defaults to the first option').toBeChecked();
      await expect(hw.assignDueOption(0)).toContainText(/1\s*day/i);
    }
  );

  test('AIH-04-02: sending is blocked while the homework title is empty', { tag: ['@negative'] }, async ({ user }) => {
    const hw = user.aiHomework;
    await hw.assignTitleInput.fill('');
    await expect(hw.assignSendBtn).toBeDisabled();
  });

  test('AIH-04-03: sending is blocked when no class is ticked', { tag: ['@negative'] }, async ({ user }) => {
    const hw = user.aiHomework;
    const n = await hw.assignClassOptions.count();
    for (let i = 0; i < n; i++)
      if (await hw.assignClassCheckbox(i).isChecked()) await hw.assignClassOption(i).click({ force: true });
    expect(await hw.checkedClassCount()).toBe(0);
    await expect(hw.assignSendBtn).toBeDisabled();
  });

  test(
    'AIH-04-04: Previous returns to the questions with nothing lost, and the form keeps its values',
    { tag: ['@functional', '@bug'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232): Previous keeps the generated questions, but going Next again
      // resets the edited homework title to the default ("Homework: Chapter N. ...").
      test.fail(true, 'Going Previous then Next resets the edited homework title');
      const hw = user.aiHomework;
      await hw.assignTitleInput.fill('Sets practice (edited)');
      await hw.hideKeyboard();
      // Questions are hidden on the assign step: read them on the builder step (Previous), go forward, and back again.
      await hw.assignPreviousBtn.click();
      await expect(hw.nextBtn).toBeVisible({ timeout: 10000 });
      await hw.waitForMathRendered();
      const questionsBefore = await hw.questions.allTextContents();
      await hw.goToAssign();
      await expect(hw.assignTitleInput, 'form kept its edited title').toHaveValue('Sets practice (edited)');
      await hw.assignPreviousBtn.click();
      await expect(hw.nextBtn).toBeVisible({ timeout: 10000 });
      await expect(hw.questions).toHaveCount(5);
      await hw.waitForMathRendered();
      expect(await hw.questions.allTextContents(), 'same questions').toEqual(questionsBefore);
      await hw.goToAssign();
      await expect(hw.assignTitleInput, 'form kept its edited title').toHaveValue('Sets practice (edited)');
    }
  );

  test(
    'AIH-04-05: Discard closes the builder, and opening it again starts fresh',
    { tag: ['@functional'] },
    async ({ user }) => {
      const hw = user.aiHomework;
      await hw.assignDiscardBtn.click();
      await expect(hw.assignTitleInput).toBeHidden({ timeout: 10000 });
      await expect(hw.selectChapterBtn).toBeHidden();
      await hw.open(user.magnet);
      await expect(hw.questions, 'no leftover questions').toHaveCount(0);
      await expect(hw.hwObjInput, 'counts back to the default').toHaveValue('15');
    }
  );

  test(
    'AIH-04-06: Ready to Send assigns the homework and shows a success message',
    { tag: ['@smoke', '@functional'] },
    async ({ user, page }) => {
      const hw = user.aiHomework;
      await hw.assignTitleInput.fill(`AutoTest homework ${Date.now()}`);
      await hw.hideKeyboard();
      const sent = page.waitForResponse(
        (r) =>
          ['POST', 'PUT'].includes(r.request().method()) &&
          /assign|homework|worksheet/i.test(r.url()) &&
          !/rag/i.test(r.url()),
        {
          timeout: 30000,
        }
      );
      await hw.assignSendBtn.click();
      expect((await sent).ok(), 'the assign request succeeded').toBe(true);
      await expect(hw.snackbar.first(), 'success message').toContainText(/sent|success|assigned|shared/i, {
        timeout: 20000,
      });
      await expect(hw.assignTitleInput).toBeHidden({ timeout: 20000 });
    }
  );

  test(
    'AIH-04-07: the longest "Due in" option (3 days) is accepted when sending',
    { tag: ['@edge'] },
    async ({ user }) => {
      const hw = user.aiHomework;
      const last = (await hw.assignDueOptions.count()) - 1;
      await expect(hw.assignDueOption(last)).toContainText(/3\s*day/i);
      await hw.assignDueOption(last).click();
      await expect(hw.assignDueRadio(last)).toBeChecked();
      await hw.assignTitleInput.fill(`AutoTest homework 3 days ${Date.now()}`);
      await hw.hideKeyboard();
      await hw.assignSendBtn.click();
      await expect(hw.snackbar.first()).toContainText(/sent|success|assigned|shared/i, { timeout: 20000 });
    }
  );
});
