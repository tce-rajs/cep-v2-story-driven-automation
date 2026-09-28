// AIN-04 — Leave the notice composer
// Source: CEPV2_Stories/13_AINotices.md

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'default', cleanBoard: true });

test.describe('AIN-04 Leave the notice composer', () => {
  test.afterEach(async ({ app }) => {
    await app.aiNotices.closeAll();
    await app.page
      .locator('[data-qa-id="ai-homework-option-discard-btn"]')
      .click({ force: true, timeout: 2000 })
      .catch(() => {});
  });

  test(
    'AIN-04-01: closing the composer with unsent edits warns before discarding them',
    { tag: ['@bug', '@negative'] },
    async ({ user, page }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232): the composer's Close button cannot be pressed -- the capture
      // tool's black-overlay (app-select-tool) lies over it and takes the click (elementFromPoint at Close is the overlay); with
      // Virtual Keyboard on, the on-screen keyboard also slides up over it. So Close does nothing, and this case cannot be reached.
      test.fail(true, "The notice composer's Close button is covered by the capture overlay and cannot be clicked");
      const n = user.aiNotices;
      await n.openComposer(user);
      await n.titleInput.fill('Unsent edited title');
      await n.close();
      const warning = page
        .locator('mat-dialog-container, [role="dialog"], [role="alertdialog"]')
        .filter({ hasText: /discard|unsaved|lose|are you sure/i });
      await expect(warning, 'a discard warning appears').toBeVisible({ timeout: 5000 });
    }
  );

  test(
    'AIN-04-02: opening and closing the composer 5 times leaves exactly one clean composer',
    { tag: ['@bug', '@edge'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232): the composer's Close button cannot be pressed -- the capture
      // tool's black-overlay (app-select-tool) lies over it and takes the click (elementFromPoint at Close is the overlay); with
      // Virtual Keyboard on, the on-screen keyboard also slides up over it. So Close does nothing, and this case cannot be reached.
      test.fail(true, "The notice composer's Close button is covered by the capture overlay and cannot be clicked");
      const n = user.aiNotices;
      await n.openComposer(user);
      for (let i = 0; i < 4; i++) {
        await n.close();
        await expect(n.titleInput).toBeHidden({ timeout: 10000 });
        await user.magnet.choose('notice');
        const box = await user.toolbar.wbSvg.boundingBox();
        await n.dragSelect(box, { x: 250, y: 270 }, { x: 650, y: 345 });
        await n.approveBtn.click({ force: true });
        await n.titleInput.waitFor({ state: 'visible', timeout: 30000 });
      }
      await expect(n.titleInput, 'exactly one composer').toHaveCount(1);
      await expect(n.sendBtn).toHaveCount(1);
    }
  );

  test(
    'AIN-04-03: clicking Current Class while the composer is open does not break the app, and switching class works after closing it (regression)',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      const n = user.aiNotices;
      await n.openComposer(user);
      await user.whiteboard.currentClassBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1500);
      await page.keyboard.press('Escape');
      if (await n.isComposerOpen()) await n.close();
      await expect(n.titleInput).toBeHidden({ timeout: 10000 });

      await user.nav.applyClassMap('navigationGeneral');
      await expect(user.whiteboard.currentClassBtn).toContainText('Class 5');
      expect(errors).toEqual([]);
    }
  );

  test(
    'AIN-04-04: opening Notice while the Homework panel is open does not stack two Magnet panels (regression, Zoho TCN-I15361)',
    { tag: ['@bug', '@regression'] },
    async ({ user, page }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232; Zoho TCN-I15361, still open): with the Homework builder open,
      // Magnet -> Notice also starts Notice capture, so two Magnet panels are open at once.
      test.fail(true, 'Notice capture opens on top of an open Homework builder (two Magnet panels at once)');
      await user.magnet.choose('homework');
      await expect(user.magnet.panels.homework).toBeVisible({ timeout: 15000 });
      await user.magnet.tool.click({ force: true });
      await page.waitForTimeout(800);
      await user.magnet.noticeItem.click({ force: true, timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2000);
      const open = [
        await user.magnet.panels.homework.isVisible().catch(() => false),
        await user.aiNotices.captureBanner.isVisible().catch(() => false),
      ];
      expect(open.filter(Boolean).length, 'at most one Magnet panel open').toBeLessThanOrEqual(1);
    }
  );
});
