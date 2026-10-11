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

  // Closing the menu with Escape (TB-12-04) and by clicking away (TB-12-05): one test each.
  /** Draw a rectangle, note the board, then right-click it. Returns the board as it was before the menu opened. */
  const openShapeMenu = async (user, page) => {
    const tb = user.toolbar;
    await tb.chooseShape('gtDrawRect');
    await tb.drawStroke({ x: 500, y: 400 }, { x: 700, y: 520 }, 10);
    await tb.selectTool('gtSelect');
    const board = await user.content.pathGeometry();
    const b = await tb.lastPathBox();
    await page.mouse.click(b.x + b.width / 2, b.y + 2, { button: 'right' });
    await expect(tb.pathMenuDeleteBtn, 'set-up: object menu shown').toBeVisible({ timeout: 5000 });
    return board;
  };

  test(
    'TB-12-04: Escape closes the right-click menu without changing anything',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const before = await openShapeMenu(user, page);
      await page.keyboard.press('Escape');
      await expect(user.toolbar.pathMenuDeleteBtn, 'the menu closed').toBeHidden({ timeout: 5000 });
      expect(await user.content.pathGeometry(), 'nothing changed').toEqual(before);
    }
  );

  test(
    'TB-12-05: clicking away closes the right-click menu without changing anything',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const before = await openShapeMenu(user, page);
      const canvas = await user.toolbar.wbSvg.boundingBox();
      await page.mouse.click(canvas.x + canvas.width - 300, canvas.y + canvas.height - 250);
      await expect(user.toolbar.pathMenuDeleteBtn, 'the menu closed').toBeHidden({ timeout: 5000 });
      expect(await user.content.pathGeometry(), 'nothing changed').toEqual(before);
    }
  );

  test('TB-12-06: right-clicking empty board opens no object menu', { tag: ['@negative'] }, async ({ user, page }) => {
    const tb = user.toolbar;
    await tb.selectTool('gtSelect');
    const c = await tb.wbSvg.boundingBox();
    await page.mouse.click(c.x + c.width - 350, c.y + c.height - 280, { button: 'right' });
    await page.waitForTimeout(800);
    await expect(
      page
        .locator(
          '[data-qa-id^="toolbar-path-menu-"], [data-qa-id^="toolbar-text-menu-"], [data-qa-id^="toolbar-image-menu-"]'
        )
        .filter({ visible: true }),
      'no object menu on empty board'
    ).toHaveCount(0);
  });
});
