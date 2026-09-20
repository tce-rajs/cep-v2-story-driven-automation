// TB-07 — Undo / Redo
// Source: CEPV2_Stories/05_Toolbar.md

const { test, expect } = require('../../fixtures');

// Counts and "last path" lookups need a blank board, not the persisted content earlier tests left behind.
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
});
