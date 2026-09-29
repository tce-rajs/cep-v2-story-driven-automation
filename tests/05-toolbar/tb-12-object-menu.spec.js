// TB-12 — Right-click menu on board objects
// Source: CEPV2_Stories/05_Toolbar.md
// A selected stroke/shape shows the toolbar-path-menu-* actions (Delete, Duplicate, To Front, To Back).

const { test, expect } = require('../../fixtures');

test.use({ freshSpace: true });

test.describe('TB-12 Right-click menu on board objects', () => {
  test(
    'TB-12-01: right-clicking an object on the board opens its menu',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const tb = user.toolbar;
      await tb.chooseShape('gtDrawRect');
      await tb.drawStroke({ x: 500, y: 400 }, { x: 700, y: 520 }, 10);
      await tb.selectTool('gtSelect');
      const b = await tb.lastPathBox();
      await page.mouse.click(b.x + b.width / 2, b.y + 2, { button: 'right' });
      await expect(tb.pathMenuDeleteBtn, 'object menu shown').toBeVisible({ timeout: 5000 });
      await expect(tb.pathMenuDuplicateBtn).toBeVisible();
    }
  );

  test(
    'TB-12-02: clicking an inserted image selects it and shows its controls',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await user.content.addGalleryImage();
      const image = user.toolbar.wbSvg.locator('image').last();
      await expect(image).toBeVisible({ timeout: 15000 });
      await user.toolbar.selectTool('gtSelect');
      await image.click({ force: true });
      await expect(
        page
          .locator('[data-qa-id^="toolbar-image-menu-"], [data-qa-id^="toolbar-path-menu-"]')
          .filter({ visible: true })
          .first(),
        'image controls shown'
      ).toBeVisible({ timeout: 5000 });
    }
  );

  test('TB-12-03: Delete from the menu removes the object', { tag: ['@functional'] }, async ({ user, page }) => {
    const tb = user.toolbar;
    await tb.chooseShape('gtDrawRect');
    await tb.drawStroke({ x: 500, y: 400 }, { x: 700, y: 520 }, 10);
    const before = await tb.pathCount();
    await tb.selectTool('gtSelect');
    const b = await tb.lastPathBox();
    await page.mouse.click(b.x + b.width / 2, b.y + 2, { button: 'right' });
    await tb.pathMenuDeleteBtn.click({ force: true });
    await expect.poll(() => tb.pathCount(), { message: 'object removed' }).toBe(before - 1);
  });
});
