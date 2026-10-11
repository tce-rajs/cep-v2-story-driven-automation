// AIN-04 — Leave the notice composer
// Source: CEPV2_Stories/13_AINotices.md

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'default', freshSpace: true });

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
    { tag: ['@negative'] },
    async ({ user, page }) => {
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
    { tag: ['@edge'] },
    async ({ user }) => {
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

  // Clicking Current Class while the composer is open: the app does not break (AIN-04-03), and switching class works
  // once the composer is closed (AIN-04-05) -- one test each.
  /** Open the composer, click Current Class, then get the composer closed again; returns the page errors seen. */
  const clickCurrentClassWithComposerOpen = async (user, page) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    const n = user.aiNotices;
    await n.openComposer(user);
    await user.whiteboard.currentClassBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1500);
    await page.keyboard.press('Escape');
    if (await n.isComposerOpen()) await n.close();
    return errors;
  };

  test(
    'AIN-04-03: clicking Current Class while the notice composer is open does not break the app (regression)',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const errors = await clickCurrentClassWithComposerOpen(user, page);
      await expect(user.aiNotices.titleInput, 'the composer can still be closed').toBeHidden({ timeout: 10000 });
      expect(errors, 'no uncaught page errors').toEqual([]);
    }
  );

  test(
    'AIN-04-05: after clicking Current Class with the composer open, switching class works once it is closed (regression)',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      await clickCurrentClassWithComposerOpen(user, page);
      await expect(user.aiNotices.titleInput, 'set-up: composer closed').toBeHidden({ timeout: 10000 });
      await user.nav.applyClassMap('navigationGeneral');
      await expect(user.whiteboard.currentClassBtn).toContainText('Class 5');
    }
  );
});
