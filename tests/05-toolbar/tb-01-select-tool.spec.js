// TB-01 — Select Tool
// Source: CEPV2_Stories/05_Toolbar.md

const { test, expect } = require('../../fixtures');

test.use({ cleanBoard: true });

test.describe('TB-01 Select Tool', () => {
  test(
    'TB-01-01: the Select tool selects objects on the canvas correctly',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      await tb.penStroke({ x: 350, y: 300 }, { x: 550, y: 420 });

      await tb.selectTool('gtSelect');
      const box = await tb.lastPathBox();
      await user.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await user.page.waitForTimeout(800);

      // A selected object shows its own action menu.
      await expect(tb.pathMenuDeleteBtn).toBeVisible();
      await expect(tb.pathMenuDuplicateBtn).toBeVisible();
      await expect(tb.pathMenuToFrontBtn).toBeVisible();
      await expect(tb.pathMenuToBackBtn).toBeVisible();
    }
  );

  test(
    'TB-01-02: clicking empty canvas while an object is selected deselects it',
    { tag: ['@edge'] },
    async ({ user }) => {
      const tb = user.toolbar;
      await tb.penStroke({ x: 350, y: 300 }, { x: 550, y: 420 });
      await tb.selectTool('gtSelect');
      const box = await tb.lastPathBox();
      await user.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await expect(tb.pathMenuDeleteBtn).toBeVisible();

      // A point well away from anything drawn.
      const canvas = await tb.wbSvg.boundingBox();
      await user.page.mouse.click(canvas.x + canvas.width - 300, canvas.y + canvas.height - 250);
      await user.page.waitForTimeout(600);

      await expect(tb.pathMenuDeleteBtn).toBeHidden();
    }
  );
});
