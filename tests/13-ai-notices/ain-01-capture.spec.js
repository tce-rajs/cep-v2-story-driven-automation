// AIN-01 — Capture text from the whiteboard into a notice
// Source: CEPV2_Stories/13_AINotices.md
// Class 12A Physics ('default') lists Notice in Magnet. The capture reads real text, so each test types some first.

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'default', cleanBoard: true });

test.describe('AIN-01 Capture text from the whiteboard into a notice', () => {
  test.afterEach(async ({ app }) => {
    await app.aiNotices.closeAll();
  });

  test(
    'AIN-01-01: Magnet → Notice switches the whiteboard into capture mode',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await user.magnet.choose('notice');
      await expect(user.aiNotices.captureBanner).toBeVisible({ timeout: 10000 });
      await expect(user.aiNotices.captureBanner).toContainText(/capture the text area to add as your notice/i);
    }
  );

  test(
    'AIN-01-02: dragging over the whiteboard draws a selection with Approve and Discard controls',
    { tag: ['@functional'] },
    async ({ user }) => {
      await user.aiNotices.captureText(user);
      await expect(user.aiNotices.selectionControls, 'Approve and Discard').toHaveCount(2);
      await expect(user.aiNotices.approveBtn).toBeVisible();
      await expect(user.aiNotices.discardBtn).toBeVisible();
    }
  );

  test(
    'AIN-01-03: Discard removes the selection and does not open the composer',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await user.aiNotices.captureText(user);
      await user.aiNotices.discardBtn.click({ force: true });
      await expect(user.aiNotices.selectionControls, 'selection controls gone').toHaveCount(0);
      await page.waitForTimeout(2000);
      await expect(user.aiNotices.titleInput, 'no composer').toBeHidden();
    }
  );

  test(
    'AIN-01-04: approving a selection over real text opens the composer with an AI title and the captured text',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await user.aiNotices.openComposer(user, 'Photosynthesis is important');
      await expect(user.aiNotices.touchedUpToast).toBeVisible({ timeout: 10000 });
      expect((await user.aiNotices.titleInput.inputValue()).trim().length, 'title filled in').toBeGreaterThan(3);
      await expect(user.aiNotices.bodyEditor).toContainText(/photosynthesis/i);
    }
  );

  test(
    'AIN-01-05: approving a selection over an empty area shows "Unable to process"',
    { tag: ['@negative'] },
    async ({ user }) => {
      await user.magnet.choose('notice');
      await expect(user.aiNotices.captureBanner).toBeVisible({ timeout: 10000 });
      const box = await user.toolbar.wbSvg.boundingBox();
      await user.aiNotices.dragSelect(box, { x: 700, y: 450 }, { x: 900, y: 550 });
      await user.aiNotices.approveBtn.click({ force: true });
      await expect(user.aiNotices.unableToProcessToast).toBeVisible({ timeout: 20000 });
      await expect(user.aiNotices.titleInput).toBeHidden();
    }
  );

  test(
    'AIN-01-06: a selection holding both text and an image gives a usable result',
    { tag: ['@edge'] },
    async ({ user }) => {
      await user.content.addGalleryImage();
      await user.aiNotices.captureText(user, 'Water cycle notes');
      const box = await user.toolbar.wbSvg.boundingBox();
      // Re-select a larger area that covers the text and the gallery image beside it.
      await user.aiNotices.discardBtn.click({ force: true });
      await user.magnet.choose('notice');
      await user.aiNotices.dragSelect(
        box,
        { x: 150, y: 150 },
        { x: Math.min(box.width - 20, 1200), y: Math.min(box.height - 20, 650) }
      );
      await user.aiNotices.approveBtn.click({ force: true });
      // Usable: either a composer with text in it, or the clear "unable to process" message -- never a hang or crash.
      await expect(user.aiNotices.titleInput.or(user.aiNotices.unableToProcessToast)).toBeVisible({ timeout: 30000 });
      if (await user.aiNotices.isComposerOpen()) {
        await expect(user.aiNotices.bodyEditor).toContainText(/water|cycle|notes/i);
      }
    }
  );
});
