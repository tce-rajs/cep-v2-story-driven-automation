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

  test(
    'AIH-05-01: when generation fails the teacher is told, the spinner stops, and Generate can be pressed again',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const hw = user.aiHomework;
      await page.route('**/*', (route) =>
        isGenerate(route.request()) ? route.abort('internetdisconnected') : route.continue()
      );
      await hw.generateBtn.click();
      await expect(
        page.getByText(/fail|error|could not|couldn.t|unable|try again|network|something went wrong/i).first(),
        'a clear message that generation failed'
      ).toBeVisible({ timeout: 30000 });
      await expect(
        page.locator('.ngx-spinner-overlay, mat-spinner, .spinner').filter({ visible: true }),
        'no endless spinner'
      ).toHaveCount(0, {
        timeout: 15000,
      });
      await expect(hw.generateBtn, 'Generate can be pressed again').toBeEnabled();
      await page.unroute('**/*');
      await hw.generate();
      expect(await hw.questions.count(), 'a retry generates the questions').toBeGreaterThan(0);
    }
  );

  test(
    'AIH-05-02: when sending fails the form stays open with the teacher’s title, and no success message is shown',
    { tag: ['@negative'] },
    async ({ user, page }) => {
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
      await expect(hw.snackbar.filter({ hasText: /sent|success|assigned|shared/i }), 'no success message').toHaveCount(
        0
      );
      await expect(
        page.getByText(/fail|error|could not|couldn.t|unable|try again|network/i).first(),
        'the teacher is told it was not sent'
      ).toBeVisible({ timeout: 10000 });
      await expect(hw.assignTitleInput, 'the form stays open with the title').toHaveValue(title);
    }
  );
});
