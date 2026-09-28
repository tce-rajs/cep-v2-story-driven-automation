// AIN-05 — Sending a notice when the network fails
// Source: CEPV2_Stories/13_AINotices.md
// Only the notice's own send request (POST .../noticeboard) is made to fail; everything else keeps working. AIN-05-02
// really sends one notice to the current class (owner-approved real sends, 2026-09-26).

const { test, expect } = require('../../fixtures');

const isSend = (req) => req.method() === 'POST' && /noticeboard/i.test(req.url());

test.describe('AIN-05 Sending a notice when the network fails', () => {
  test.use({ cleanBoard: true });

  test.beforeEach(async ({ user }) => {
    await user.aiNotices.openComposer(user);
  });

  test.afterEach(async ({ app }) => {
    await app.page.unroute('**/*').catch(() => {});
    await app.aiNotices.closeAll();
  });

  test(
    'AIN-05-01: a failed send says so, keeps the composer open with the teacher’s text, and shows no success message',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const n = user.aiNotices;
      const title = `AutoTest failed-send ${Date.now()}`;
      await n.titleInput.fill(title);
      await n.hideKeyboard();
      await page.route('**/*', (route) =>
        isSend(route.request()) ? route.abort('internetdisconnected') : route.continue()
      );
      await n.sendBtn.click();
      await page.waitForTimeout(5000);
      await expect(
        page.getByText(/sent successfully|notice (sent|shared)|success/i).first(),
        'no success message for a notice that was not sent'
      ).toBeHidden();
      await expect(
        page.getByText(/fail|error|could not|couldn.t|unable|try again|network|offline/i).first(),
        'the teacher is told the notice was not sent'
      ).toBeVisible({ timeout: 10000 });
      await expect(n.titleInput, 'the composer stays open').toBeVisible();
      await expect(n.titleInput, 'with the teacher’s title kept').toHaveValue(title);
    }
  );

  test(
    'AIN-05-02: after a failed send, sending again once the network is back sends the notice exactly once',
    { tag: ['@negative', '@regression'] },
    async ({ user, page }) => {
      const n = user.aiNotices;
      await n.untickAllClasses();
      await n.classOption(0).click({ force: true });
      await n.titleInput.fill(`AutoTest retry-send ${Date.now()}`);
      await n.hideKeyboard();
      await page.route('**/*', (route) =>
        isSend(route.request()) ? route.abort('internetdisconnected') : route.continue()
      );
      await n.sendBtn.click();
      await page.waitForTimeout(5000);
      await page.unroute('**/*');

      const sent = [];
      page.on('response', (r) => isSend(r.request()) && sent.push(r.status()));
      test.skip(
        !(await n.sendBtn.isVisible().catch(() => false)),
        'the composer closed after the failure (AIN-05-01 fails)'
      );
      await n.sendBtn.click();
      await page.waitForTimeout(8000);
      expect(sent, 'exactly one successful send after the retry').toEqual([expect.any(Number)]);
      expect(sent[0], 'and it succeeded').toBeLessThan(300);
    }
  );
});
