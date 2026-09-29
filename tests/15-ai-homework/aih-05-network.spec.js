// AIH-05 — AI Homework when the network or the AI service fails
// Source: CEPV2_Stories/15_AIHomework.md
// Only the feature's own request is made to fail: the AI generation (POST .../rag/worksheet) or the assign request.
// Nothing is really assigned: the send is blocked in AIH-05-02.

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'aiHomework' });
test.describe.configure({ timeout: 300000 });

const isGenerate = (req) => req.method() === 'POST' && /rag\/worksheet/i.test(req.url());
const isAssign = (req) =>
  ['POST', 'PUT'].includes(req.method()) && /assign|homework/i.test(req.url()) && !/rag/i.test(req.url());

test.describe('AIH-05 AI Homework when the network fails', () => {
  test.beforeEach(async ({ user }) => {
    await user.aiHomework.open(user.magnet);
    await user.aiHomework.setHomeworkCount(5);
  });

  test.afterEach(async ({ app }) => {
    await app.page.unroute('**/*').catch(() => {});
    await app.aiHomework.closeAll();
  });

  // Generation fails: the teacher is told (AIH-05-01), the spinner stops (AIH-05-03), and pressing Generate again works
  // (AIH-05-04) -- one test each (split 2026-09-28).
  const generateWhileItFails = async (user, page) => {
    await page.route('**/*', (route) =>
      isGenerate(route.request()) ? route.abort('internetdisconnected') : route.continue()
    );
    await user.aiHomework.generateBtn.click();
  };
  const failedMessage = (page) =>
    page.getByText(/fail|error|could not|couldn.t|unable|try again|network|something went wrong/i).first();

  test(
    'AIH-05-01: when homework generation fails, the teacher is told',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      await generateWhileItFails(user, page);
      await expect(failedMessage(page), 'a clear message that generation failed').toBeVisible({ timeout: 30000 });
    }
  );

  test(
    'AIH-05-03: when homework generation fails, the spinner stops',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      await generateWhileItFails(user, page);
      await expect(
        page.locator('.ngx-spinner-overlay, mat-spinner, .spinner').filter({ visible: true }),
        'no endless spinner'
      ).toHaveCount(0, { timeout: 45000 });
    }
  );

  test(
    'AIH-05-04: after homework generation fails, pressing Generate again generates the questions',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const hw = user.aiHomework;
      await generateWhileItFails(user, page);
      await expect(failedMessage(page), 'set-up: generation failed').toBeVisible({ timeout: 30000 });
      await expect(hw.generateBtn, 'Generate can be pressed again').toBeEnabled({ timeout: 15000 });
      await page.unroute('**/*');
      await hw.generate();
      expect(await hw.questions.count(), 'a retry generates the questions').toBeGreaterThan(0);
    }
  );

  // Sending fails: no success message (AIH-05-02), the teacher is told (AIH-05-06), and the form stays open with the
  // title (AIH-05-07) -- one test each (split 2026-09-28). Nothing is really assigned: the send is blocked.
  /** Generate, title the homework, make only the assign request fail, and press Ready to Send; returns the title. */
  const sendWhileItFails = async (user, page) => {
    const hw = user.aiHomework;
    await hw.generate();
    await hw.goToAssign();
    const title = `AutoTest failed-assign ${Date.now()}`;
    await hw.assignTitleInput.fill(title);
    await hw.hideKeyboard();
    await page.route('**/*', (route) =>
      isAssign(route.request()) ? route.abort('internetdisconnected') : route.continue()
    );
    await hw.assignSendBtn.click();
    await page.waitForTimeout(6000);
    return title;
  };

  test(
    'AIH-05-02: when sending homework fails, no success message appears',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      await sendWhileItFails(user, page);
      await expect(
        user.aiHomework.snackbar.filter({ hasText: /sent|success|assigned|shared/i }),
        'no success message'
      ).toHaveCount(0);
    }
  );

  test(
    'AIH-05-06: when sending homework fails, the teacher is told',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      await sendWhileItFails(user, page);
      await expect(
        page.getByText(/fail|error|could not|couldn.t|unable|try again|network/i).first(),
        'the teacher is told it was not sent'
      ).toBeVisible({ timeout: 10000 });
    }
  );

  test(
    'AIH-05-07: when sending homework fails, the form stays open with the teacher’s title',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const title = await sendWhileItFails(user, page);
      await expect(user.aiHomework.assignTitleInput, 'the form stays open with the title').toHaveValue(title);
    }
  );
});
