// TB-06 — Shapes (Choose / Draw / Symbols)
// Source: CEPV2_Stories/05_Toolbar.md
// Shapes panel entries (confirmed live, signed out and in): gtDrawRect, gtDrawCircle, gtDrawLine (drag to draw),
// gtInsertRect etc. (click to place), gtMoreShapes ("More symbols..."). The tool must be re-chosen before EVERY shape.

const { test, expect } = require('../../fixtures');

// Counts and "last path" lookups need a blank board, not the persisted content earlier tests left behind.
test.use({ cleanBoard: true });

test.describe('TB-06 Shapes (Choose / Draw / Symbols)', () => {
  for (const [label, shapeId] of [
    ['rectangle', 'gtDrawRect'],
    ['circle', 'gtDrawCircle'],
    ['line', 'gtDrawLine'],
  ]) {
    test(
      `TB-06-01: selecting a shape and dragging draws the expected shape (${label})`,
      { tag: ['@smoke', '@functional'] },
      async ({ user }) => {
        const tb = user.toolbar;
        const canvas = await tb.wbSvg.boundingBox();
        const before = await tb.pathCount();

        await tb.chooseShape(shapeId);
        await tb.drawStroke({ x: 500, y: 400 }, { x: 760, y: 560 }, 12);

        expect(await tb.pathCount(), `a ${label} was added`).toBe(before + 1);
        // Its extent follows the drag, and it is not a scribble: rectangle/circle span both axes.
        const box = await tb.lastPathBox();
        expect(box.x).toBeGreaterThan(canvas.x + 450);
        expect(box.x + box.width).toBeLessThan(canvas.x + 810);
        expect(box.width).toBeGreaterThan(150);
        expect(box.height).toBeGreaterThan(80);
      }
    );
  }

  test(
    'TB-06-02: the symbols picker inserts the selected symbol onto the canvas',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const tb = user.toolbar;
      const before = await tb.wbSvg.locator('*').count();

      await tb.openToolPanel('gtShapes');
      await page.locator('[data-qa-id="toolbar-shape-gtMoreShapes"]').click({ force: true });
      await page.waitForTimeout(1000);

      // The picker is a new surface ("Symbols", tabbed by category): choose the first symbol offered.
      const symbol = page.locator('[data-qa-id^="toolbar-advance-shape-"]').first();
      await expect(symbol, 'a symbol is offered').toBeVisible({ timeout: 5000 });
      await symbol.click({ force: true });
      await page.waitForTimeout(500);

      // Placing it: click on the canvas (same "choose, then place" behaviour as the fixed shapes).
      const canvas = await tb.wbSvg.boundingBox();
      await page.mouse.click(canvas.x + 800, canvas.y + 500);
      await page.waitForTimeout(1000);

      expect(await tb.wbSvg.locator('*').count(), 'the symbol was added to the canvas').toBeGreaterThan(before);
    }
  );

  test(
    'TB-06-03: drawing 50+ shape objects on one canvas does not degrade responsiveness',
    { tag: ['@performance', '@regression'] },
    async ({ user }) => {
      test.setTimeout(6 * 60 * 1000);
      const tb = user.toolbar;

      const timeOneStroke = async (x) => {
        const start = Date.now();
        await tb.drawStroke({ x, y: 300 }, { x: x + 100, y: 380 }, 6);
        return Date.now() - start;
      };
      const baseline = await timeOneStroke(300);

      const before = await tb.pathCount();
      for (let i = 0; i < 52; i++) {
        await tb.chooseShape('gtDrawRect');
        const col = i % 13;
        const row = Math.floor(i / 13);
        await tb.drawStroke({ x: 200 + col * 90, y: 450 + row * 70 }, { x: 260 + col * 90, y: 500 + row * 70 }, 4);
      }
      expect(await tb.pathCount()).toBeGreaterThanOrEqual(before + 50);

      // Same simple action, now with 50+ objects on the board.
      const loaded = await timeOneStroke(1500);
      test.info().annotations.push({
        type: 'note',
        description: `One stroke: ${baseline}ms empty vs ${loaded}ms with 50+ shapes`,
      });
      expect(loaded, 'still responsive (within 3x baseline + 2s)').toBeLessThan(baseline * 3 + 2000);
      await expect(tb.container).toBeVisible();
    }
  );

  test(
    "TB-06-04: clicking with the Shapes tool without dragging doesn't add an invisible, zero-size shape",
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const tb = user.toolbar;
      const before = await tb.pathCount();
      await tb.chooseShape('gtDrawRect');
      const box = await tb.wbSvg.boundingBox();
      await page.mouse.click(box.x + 600, box.y + 450);
      await page.waitForTimeout(800);
      const tiny = await tb.paths.evaluateAll(
        (els) =>
          els.filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width < 3 && r.height < 3;
          }).length
      );
      expect(tiny, 'no zero-size shape on the board').toBe(0);
      expect(await tb.pathCount()).toBeLessThanOrEqual(before + 1);
    }
  );
});
