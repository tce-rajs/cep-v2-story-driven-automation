// TB-01 — Select Tool
// Source: CEPV2_Stories/05_Toolbar.md

const { test, expect } = require('../../fixtures');

test.use({ freshSpace: true });

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

  test(
    'TB-01-03: a selected stroke can be dragged to a new place and is still there after a reload',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const near = (a, b, tol = 4) => Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol;
      const tb = user.toolbar;
      await tb.penStroke({ x: 400, y: 380 }, { x: 560, y: 440 });
      const [start] = await tb.boardCentres();
      await tb.selectTool('gtSelect');
      const box = await tb.lastPathBox();
      const grab = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      await page.mouse.click(grab.x, grab.y);
      await expect(tb.pathMenuDeleteBtn, 'set-up: the stroke is selected').toBeVisible();
      await page.mouse.move(grab.x, grab.y);
      await page.mouse.down();
      await page.mouse.move(grab.x + 200, grab.y + 120, { steps: 15 });
      await page.mouse.up();
      await page.waitForTimeout(800);
      const [moved] = await tb.boardCentres();
      expect(near(moved, start), 'set-up: the stroke moved').toBe(false);
      await page.waitForTimeout(12000); // past the autosave countdown
      await page.reload();
      await user.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
      await tb.waitForBoardToSettle();
      const after = await tb.boardCentres(); // after a reload every stroke counts as the test's own
      expect(
        after.some((c) => near(c, moved)),
        'the stroke is where it was moved to'
      ).toBe(true);
      expect(
        after.some((c) => near(c, start)),
        'and not back where it started'
      ).toBe(false);
    }
  );

  test(
    'TB-01-04: dragging a box with Select selects several objects at once',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const tb = user.toolbar;
      await tb.penStroke({ x: 450, y: 400 }, { x: 550, y: 430 });
      await tb.penStroke({ x: 450, y: 480 }, { x: 550, y: 510 });
      const before = await tb.boardCentres();
      await tb.selectTool('gtSelect');
      const c = await tb.wbSvg.boundingBox();
      // Drag a box around both strokes.
      await page.mouse.move(c.x + 400, c.y + 360);
      await page.mouse.down();
      await page.mouse.move(c.x + 600, c.y + 560, { steps: 15 });
      await page.mouse.up();
      await page.waitForTimeout(800);
      // Moving one of them moves the whole selection.
      const b = await tb.paths.first().boundingBox();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2 + 200, b.y + b.height / 2 + 100, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(800);
      const after = await tb.boardCentres();
      expect(after.length, 'no stroke added or lost').toBe(before.length);
      const moved = after.filter((p, k) => Math.abs(p.x - before[k].x) > 50 || Math.abs(p.y - before[k].y) > 50);
      expect(moved.length, 'both strokes moved together').toBe(2);
    }
  );

  test(
    'TB-01-05: clicking empty board with Select selects nothing and moves nothing',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const tb = user.toolbar;
      await tb.penStroke({ x: 350, y: 300 }, { x: 550, y: 420 });
      const geometry = await user.content.pathGeometry();
      const centres = await tb.boardCentres();
      await tb.selectTool('gtSelect');
      const c = await tb.wbSvg.boundingBox();
      // A point well away from the stroke.
      await page.mouse.click(c.x + c.width - 350, c.y + c.height - 280);
      await page.waitForTimeout(800);
      await expect(tb.pathMenuDeleteBtn, 'no object menu: nothing selected').toBeHidden();
      await expect(tb.textMenuDeleteBtn, 'no text menu either').toBeHidden();
      expect(await user.content.pathGeometry(), 'no stroke changed').toEqual(geometry);
      expect(await tb.boardCentres(), 'nothing moved').toEqual(centres);
    }
  );
});
