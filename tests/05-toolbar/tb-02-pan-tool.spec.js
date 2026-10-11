// TB-02 — Pan Tool
// Source: CEPV2_Stories/05_Toolbar.md

const { test, expect } = require('../../fixtures');

test.use({ freshSpace: true });

test.describe('TB-02 Pan Tool', () => {
  test(
    'TB-02-01: the Pan tool moves the canvas without affecting content placement',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      await tb.penStroke({ x: 400, y: 400 }, { x: 560, y: 470 });
      const geometryBefore = await tb.paths.last().getAttribute('d');
      const viewBefore = await user.whiteboard.innerPanGroupTransform();
      const screenBefore = await tb.lastPathBox();

      await tb.selectTool('gtPan');
      await tb.drawStroke({ x: 700, y: 500 }, { x: 900, y: 620 }, 12);

      // The view moved (the path is now somewhere else on screen)...
      const screenAfter = await tb.lastPathBox();
      const viewAfter = await user.whiteboard.innerPanGroupTransform();
      expect(screenAfter.x !== screenBefore.x || screenAfter.y !== screenBefore.y || viewAfter !== viewBefore).toBe(
        true
      );
      // ...but the content itself was not edited: same geometry, same number of objects.
      await expect(tb.paths.last()).toHaveAttribute('d', geometryBefore);
    }
  );

  test(
    'TB-02-02: panning to the extreme edge of the canvas does not glitch or break the view',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      const tb = user.toolbar;
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await tb.selectTool('gtPan');
      for (const [from, to] of [
        [
          { x: 1200, y: 500 },
          { x: 200, y: 500 },
        ],
        [
          { x: 200, y: 500 },
          { x: 1200, y: 500 },
        ],
        [
          { x: 700, y: 900 },
          { x: 700, y: 200 },
        ],
        [
          { x: 700, y: 200 },
          { x: 700, y: 900 },
        ],
      ]) {
        for (let i = 0; i < 6; i++) await tb.drawStroke(from, to, 10);
      }

      await expect(tb.wbSvg).toBeVisible();
      await expect(tb.container).toBeVisible();
      // Not broken: the canvas still takes a stroke.
      const before = await tb.pathCount();
      await tb.penStroke({ x: 500, y: 500 }, { x: 640, y: 560 });
      expect(await tb.pathCount()).toBeGreaterThan(before);
      expect(errors, 'no uncaught page errors').toEqual([]);
    }
  );

  test(
    'TB-02-03: panning never moves, deletes or duplicates any content on the board',
    { tag: ['@negative'] },
    async ({ user }) => {
      const tb = user.toolbar;
      await tb.penStroke({ x: 400, y: 400 }, { x: 560, y: 470 });
      await tb.penStroke({ x: 400, y: 520 }, { x: 560, y: 560 });
      await user.whiteboard.insertTextAndType(700, 420, 'Pan check');
      await tb.selectTool('gtSelect');
      const snapshot = await user.content.snapshot();
      const geometry = await user.content.pathGeometry();
      const centres = await tb.boardCentres();

      await tb.selectTool('gtPan');
      await tb.drawStroke({ x: 800, y: 500 }, { x: 500, y: 300 }, 12);
      await tb.drawStroke({ x: 500, y: 300 }, { x: 900, y: 650 }, 12);
      await tb.drawStroke({ x: 900, y: 650 }, { x: 800, y: 500 }, 12);

      expect(await user.content.snapshot(), 'nothing deleted or duplicated').toEqual(snapshot);
      expect(await user.content.pathGeometry(), 'no stroke edited').toEqual(geometry);
      expect(await tb.boardCentres(), 'nothing moved on the board itself').toEqual(centres);
    }
  );
});
