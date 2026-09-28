// TB-07 — Undo / Redo
// Source: CEPV2_Stories/05_Toolbar.md

const { test, expect } = require('../../fixtures');

test.use({ cleanBoard: true });

test.describe('TB-07 Undo / Redo', () => {
  test(
    'TB-07-01: Undo reverses the most recent drawing, text and shape action',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      const wb = user.whiteboard;
      const undo = () => tb.tool('gtUndo').click({ force: true });

      await test.step('drawing', async () => {
        const before = await tb.pathCount();
        await tb.penStroke({ x: 350, y: 300 }, { x: 550, y: 360 });
        expect(await tb.pathCount()).toBe(before + 1);
        await undo();
        await expect.poll(() => tb.pathCount()).toBe(before);
      });

      await test.step('text', async () => {
        const before = await wb.textObjects.count();
        await wb.insertTextAndType(400, 500, 'undo me');
        await expect(wb.textObjects).toHaveCount(before + 1);
        await tb.selectTool('gtSelect');
        await undo();
        await expect(wb.textObjects).toHaveCount(before);
      });

      await test.step('shape', async () => {
        const before = await tb.pathCount();
        await tb.chooseShape('gtDrawRect');
        await tb.drawStroke({ x: 700, y: 400 }, { x: 860, y: 520 }, 10);
        expect(await tb.pathCount()).toBe(before + 1);
        await undo();
        await expect.poll(() => tb.pathCount()).toBe(before);
      });
    }
  );

  test('TB-07-02: Redo reapplies an undone action', { tag: ['@smoke', '@functional'] }, async ({ user }) => {
    const tb = user.toolbar;
    const before = await tb.pathCount();
    await tb.penStroke({ x: 350, y: 300 }, { x: 550, y: 360 });
    const geometry = await tb.paths.last().getAttribute('d');

    await tb.tool('gtUndo').click({ force: true });
    await expect.poll(() => tb.pathCount()).toBe(before);
    await tb.tool('gtRedo').click({ force: true });

    await expect.poll(() => tb.pathCount()).toBe(before + 1);
    await expect(tb.paths.last(), 'the same stroke came back').toHaveAttribute('d', geometry);
  });

  test(
    'TB-07-03: rapid repeated Undo/Redo clicking does not skip steps or crash',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const tb = user.toolbar;
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));

      const before = await tb.pathCount();
      for (let i = 0; i < 5; i++) await tb.penStroke({ x: 300 + i * 90, y: 300 }, { x: 340 + i * 90, y: 380 });
      expect(await tb.pathCount()).toBe(before + 5);

      // Five rapid Undos remove exactly five strokes — no more, no fewer.
      for (let i = 0; i < 5; i++) await tb.tool('gtUndo').click({ force: true, delay: 0 });
      await expect.poll(() => tb.pathCount()).toBe(before);

      // Five rapid Redos bring back exactly the same five.
      for (let i = 0; i < 5; i++) await tb.tool('gtRedo').click({ force: true, delay: 0 });
      await expect.poll(() => tb.pathCount()).toBe(before + 5);

      // Then a burst of mixed clicks must leave a consistent, in-range state.
      for (let i = 0; i < 10; i++) {
        await tb.tool(i % 2 ? 'gtRedo' : 'gtUndo').click({ force: true, delay: 0 });
      }
      await page.waitForTimeout(800);
      const settled = await tb.pathCount();
      expect(settled).toBeGreaterThanOrEqual(before);
      expect(settled).toBeLessThanOrEqual(before + 5);
      expect(errors, 'no uncaught page errors').toEqual([]);
    }
  );

  // --- Added 2026-09-26 (gap-fill from the reference suite's Toolbar workbook) ---

  test(
    'TB-07-04: Undo and Redo step through 3 actions in the exact order they were made',
    { tag: ['@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      const undo = () => tb.tool('gtUndo').click({ force: true });
      const redo = () => tb.tool('gtRedo').click({ force: true });
      const base = await tb.pathData();
      await tb.penStroke({ x: 300, y: 300 }, { x: 450, y: 320 });
      const one = await tb.pathData();
      await tb.penStroke({ x: 300, y: 400 }, { x: 450, y: 420 });
      const two = await tb.pathData();
      await tb.penStroke({ x: 300, y: 500 }, { x: 450, y: 520 });
      const three = await tb.pathData();

      await undo();
      await expect.poll(() => tb.pathData()).toEqual(two);
      await undo();
      await expect.poll(() => tb.pathData()).toEqual(one);
      await undo();
      await expect.poll(() => tb.pathData()).toEqual(base);
      await redo();
      await expect.poll(() => tb.pathData()).toEqual(one);
      await redo();
      await expect.poll(() => tb.pathData()).toEqual(two);
      await redo();
      await expect.poll(() => tb.pathData()).toEqual(three);
    }
  );

  test(
    'TB-07-05: Redo with nothing to redo does nothing and causes no error',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      const tb = user.toolbar;
      await tb.penStroke({ x: 300, y: 300 }, { x: 450, y: 320 });
      const before = await tb.pathData();
      for (let i = 0; i < 3; i++) await tb.tool('gtRedo').click({ force: true });
      await page.waitForTimeout(800);
      expect(await tb.pathData()).toEqual(before);
      expect(errors).toEqual([]);
    }
  );

  test('TB-07-06: 20 actions in a row can all be undone', { tag: ['@edge'] }, async ({ user }) => {
    test.setTimeout(180000);
    const tb = user.toolbar;
    const before = await tb.pathCount();
    for (let i = 0; i < 20; i++)
      await tb.penStroke(
        { x: 200 + (i % 10) * 70, y: 300 + Math.floor(i / 10) * 150 },
        { x: 240 + (i % 10) * 70, y: 360 + Math.floor(i / 10) * 150 }
      );
    expect(await tb.pathCount()).toBe(before + 20);
    for (let i = 0; i < 20; i++) await tb.tool('gtUndo').click({ force: true });
    await expect.poll(() => tb.pathCount(), { message: 'all 20 undone' }).toBe(before);
  });

  test(
    'TB-07-07: Undo after moving an object puts the object back (regression)',
    { tag: ['@regression', '@bug'] },
    async ({ user, page }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232; same as the reference suite's TB-CYP-07): moving an object
      // adds no undo step -- Undo right after a move leaves the object where it was moved to.
      test.fail(true, 'Undo does not undo a move: the moved object stays at its new position');
      const tb = user.toolbar;
      await tb.chooseShape('gtDrawRect');
      await tb.drawStroke({ x: 500, y: 400 }, { x: 700, y: 520 }, 10);
      const home = await tb.lastPathBox();
      await tb.selectTool('gtSelect');
      const cx = home.x + home.width / 2,
        cy = home.y + 2; // on the rectangle's top edge
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + 200, cy + 120, { steps: 12 });
      await page.mouse.up();
      await page.waitForTimeout(800);
      const moved = await tb.lastPathBox();
      expect(Math.abs(moved.x - home.x) + Math.abs(moved.y - home.y), 'the shape moved').toBeGreaterThan(50);
      await tb.closePanelByTappingOutside();
      await tb.tool('gtUndo').click({ force: true });
      await expect
        .poll(
          async () => {
            const b = await tb.lastPathBox();
            return Math.abs(b.x - home.x) + Math.abs(b.y - home.y);
          },
          { message: 'Undo moved the shape back' }
        )
        .toBeLessThan(5);
    }
  );
});
