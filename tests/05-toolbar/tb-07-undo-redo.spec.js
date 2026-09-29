// TB-07 — Undo / Redo
// Source: CEPV2_Stories/05_Toolbar.md

const { test, expect } = require('../../fixtures');

test.use({ freshSpace: true });

test.describe('TB-07 Undo / Redo', () => {
  // Undo of a drawing (TB-07-01), a text box (TB-07-08) and a shape (TB-07-09): one test each (split 2026-09-28).
  test('TB-07-01: Undo reverses the most recent drawing', { tag: ['@smoke', '@functional'] }, async ({ user }) => {
    const tb = user.toolbar;
    const before = await tb.pathCount();
    await tb.penStroke({ x: 350, y: 300 }, { x: 550, y: 360 });
    expect(await tb.pathCount(), 'set-up: a stroke drawn').toBe(before + 1);
    await tb.tool('gtUndo').click({ force: true });
    await expect.poll(() => tb.pathCount()).toBe(before);
  });

  test('TB-07-08: Undo reverses the most recent text box', { tag: ['@functional'] }, async ({ user }) => {
    const wb = user.whiteboard;
    const before = await wb.textObjects.count();
    await wb.insertTextAndType(400, 500, 'undo me');
    await expect(wb.textObjects, 'set-up: a text box added').toHaveCount(before + 1);
    await user.toolbar.selectTool('gtSelect');
    await user.toolbar.tool('gtUndo').click({ force: true });
    await expect(wb.textObjects).toHaveCount(before);
  });

  test('TB-07-09: Undo reverses the most recent shape', { tag: ['@functional'] }, async ({ user }) => {
    const tb = user.toolbar;
    const before = await tb.pathCount();
    await tb.chooseShape('gtDrawRect');
    await tb.drawStroke({ x: 700, y: 400 }, { x: 860, y: 520 }, 10);
    expect(await tb.pathCount(), 'set-up: a shape drawn').toBe(before + 1);
    await tb.tool('gtUndo').click({ force: true });
    await expect.poll(() => tb.pathCount()).toBe(before);
  });

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

  // Rapid Undo (TB-07-03), rapid Redo (TB-07-10) and a mixed burst (TB-07-11): one test each (split 2026-09-28).
  const drawFive = async (tb) => {
    const before = await tb.pathCount();
    for (let i = 0; i < 5; i++) await tb.penStroke({ x: 300 + i * 90, y: 300 }, { x: 340 + i * 90, y: 380 });
    expect(await tb.pathCount(), 'set-up: five strokes drawn').toBe(before + 5);
    return before;
  };
  const rapid = async (tb, id, times) => {
    for (let i = 0; i < times; i++) await tb.tool(id).click({ force: true, delay: 0 });
  };

  test(
    'TB-07-03: five rapid Undo clicks remove exactly five strokes, no more and no fewer',
    { tag: ['@regression'] },
    async ({ user }) => {
      const tb = user.toolbar;
      const before = await drawFive(tb);
      await rapid(tb, 'gtUndo', 5);
      await expect.poll(() => tb.pathCount()).toBe(before);
    }
  );

  test(
    'TB-07-10: five rapid Redo clicks bring back exactly the five undone strokes',
    { tag: ['@regression'] },
    async ({ user }) => {
      const tb = user.toolbar;
      const before = await drawFive(tb);
      await rapid(tb, 'gtUndo', 5);
      await expect.poll(() => tb.pathCount(), { message: 'set-up: all five undone' }).toBe(before);
      await rapid(tb, 'gtRedo', 5);
      await expect.poll(() => tb.pathCount()).toBe(before + 5);
    }
  );

  test(
    'TB-07-11: a burst of mixed rapid Undo/Redo clicks leaves a consistent state and causes no error',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const tb = user.toolbar;
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      const before = await drawFive(tb);
      for (let i = 0; i < 10; i++) await tb.tool(i % 2 ? 'gtRedo' : 'gtUndo').click({ force: true, delay: 0 });
      await page.waitForTimeout(800);
      const settled = await tb.pathCount();
      expect(settled, 'no more strokes than were drawn').toBeLessThanOrEqual(before + 5);
      expect(settled, 'no fewer than before').toBeGreaterThanOrEqual(before);
      expect(errors, 'no uncaught page errors').toEqual([]);
    }
  );

  // --- Added 2026-09-26 (gap-fill from the reference suite's Toolbar workbook) ---

  // Undo order (TB-07-04) and Redo order (TB-07-12) through 3 actions: one test each (split 2026-09-28).
  /** Draw three strokes; returns the board after each step (base = before the first). */
  const threeActions = async (tb) => {
    const base = await tb.pathData();
    await tb.penStroke({ x: 300, y: 300 }, { x: 450, y: 320 });
    const one = await tb.pathData();
    await tb.penStroke({ x: 300, y: 400 }, { x: 450, y: 420 });
    const two = await tb.pathData();
    await tb.penStroke({ x: 300, y: 500 }, { x: 450, y: 520 });
    const three = await tb.pathData();
    return { base, one, two, three };
  };

  test(
    'TB-07-04: Undo steps back through 3 actions in the exact reverse order they were made',
    { tag: ['@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      const { base, one, two } = await threeActions(tb);
      for (const expected of [two, one, base]) {
        await tb.tool('gtUndo').click({ force: true });
        await expect.poll(() => tb.pathData()).toEqual(expected);
      }
    }
  );

  test(
    'TB-07-12: Redo steps forward through 3 undone actions in the exact order they were made',
    { tag: ['@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      const { base, one, two, three } = await threeActions(tb);
      for (let i = 0; i < 3; i++) await tb.tool('gtUndo').click({ force: true });
      await expect.poll(() => tb.pathData(), { message: 'set-up: all three undone' }).toEqual(base);
      for (const expected of [one, two, three]) {
        await tb.tool('gtRedo').click({ force: true });
        await expect.poll(() => tb.pathData()).toEqual(expected);
      }
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
