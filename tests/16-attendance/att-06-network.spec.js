// ATT-06 — Submitting attendance when the network fails
// Source: CEPV2_Stories/16_Attendance.md
// Only the submit request (POST .../tce-repo-api/1/res/v1/content/file) is made to fail. ATT-06-02 really submits
// today's attendance for Class 12A Physics once the network is back (owner-approved real submits, 2026-09-26).

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'attendance' });

const isSubmit = (req) => req.method() === 'POST' && /content\/file/i.test(req.url());

test.describe('ATT-06 Submitting attendance when the network fails', () => {
  test.beforeEach(async ({ user }) => {
    await user.attendance.open(user.magnet);
    await user.attendance.startMarking();
  });

  test.afterEach(async ({ app }) => {
    await app.page.unroute('**/*').catch(() => {});
    await app.attendance.closeAll();
  });

  const submitWhileDown = async (user, page) => {
    const att = user.attendance;
    await att.markAllPresent();
    await att.tap(1);
    const marks = [await att.cellState(0), await att.cellState(1), await att.cellState(2)];
    await page.route('**/*', (route) =>
      isSubmit(route.request()) ? route.abort('internetdisconnected') : route.continue()
    );
    if (await att.doneBtn.isVisible().catch(() => false)) await att.doneBtn.click({ force: true });
    await att.submitBtn.filter({ visible: true }).first().click({ force: true });
    await page.waitForTimeout(6000);
    return marks;
  };

  test(
    'ATT-06-01: a failed submit says so and keeps the register open with the marks made',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const marks = await submitWhileDown(user, page);
      await expect(
        user.attendance.container,
        'the register stays open (it does not close as if submitted)'
      ).toBeVisible();
      await expect(
        page.getByText(/fail|error|could not|couldn.t|unable|try again|network|offline/i).first(),
        'the teacher is told the attendance was not submitted'
      ).toBeVisible({ timeout: 10000 });
      await page.unroute('**/*');
      if (await user.attendance.editBtn.isVisible().catch(() => false))
        await user.attendance.editBtn.click({ force: true });
      const now = [
        await user.attendance.cellState(0),
        await user.attendance.cellState(1),
        await user.attendance.cellState(2),
      ];
      expect(now, 'the marks the teacher made are kept').toEqual(marks);
    }
  );

  test(
    'ATT-06-02: after a failed submit, submitting again once the network is back submits exactly once',
    { tag: ['@negative', '@regression'] },
    async ({ user, page }) => {
      await submitWhileDown(user, page);
      await page.unroute('**/*');
      test.skip(!(await user.attendance.isOpen()), 'the register closed after the failure (ATT-06-01 fails)');
      const sent = [];
      page.on('response', (r) => isSubmit(r.request()) && sent.push(r.status()));
      await user.attendance.submit();
      await page.waitForTimeout(3000);
      expect(sent, 'exactly one submit after the retry').toHaveLength(1);
      expect(sent[0], 'and it succeeded').toBeLessThan(300);
    }
  );
});
