// WB-07 — Eraser
// Source: CEPV2_Stories/06_Whiteboard.md
// (The eraser as a toolbar control — types, sizes, Clear — is TB-05; this story is precision on the whiteboard.)

const { test, expect } = require('../../fixtures');

// The board persists per topic: the tests work on fresh space below it and count only their own strokes (the
// teacher's writing is kept, never cleared -- owner rule 2026-09-29).
test.use({ freshSpace: true });

test.describe('WB-07 Eraser', () => {
  test(
    'WB-07-01: erasing a stroke after zooming in removes only the dragged-over portion',
    { tag: ['@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      // A long stroke, plus a neighbour that must not be touched.
      await tb.penStroke({ x: 400, y: 400 }, { x: 700, y: 400 });
      await tb.penStroke({ x: 400, y: 600 }, { x: 700, y: 600 });
      const neighbour = (await user.content.pathGeometry()).at(-1);
      const before = await user.content.pathGeometry();

      await tb.openToolPanel('gtZoom');
      await tb.zoomInBtn.click({ force: true });
      await tb.zoomInBtn.click({ force: true });
      await tb.closePanelByTappingOutside();

      // Erase a short stretch through the MIDDLE of the first stroke only (positions are post-zoom screen coords).
      const strokeBox = await tb.paths.nth(-2).boundingBox();
      const canvas = await tb.wbSvg.boundingBox();
      const midX = strokeBox.x - canvas.x + strokeBox.width / 2;
      const midY = strokeBox.y - canvas.y + strokeBox.height / 2;
      await tb.eraseDrag({ x: midX - 25, y: midY }, { x: midX + 25, y: midY }, 10);

      const after = await user.content.pathGeometry();
      expect(after, 'the stroke was changed').not.toEqual(before);
      expect(after.length, 'part of the stroke remains — it was not wiped whole').toBeGreaterThanOrEqual(before.length);
      expect(after, 'the neighbouring stroke is untouched').toContain(neighbour);
    }
  );

  test(
    'WB-07-02: erasing near another annotation after panning does not remove the neighbouring annotation',
    { tag: ['@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      await tb.penStroke({ x: 400, y: 400 }, { x: 600, y: 400 }); // target
      await tb.penStroke({ x: 400, y: 470 }, { x: 600, y: 470 }); // neighbour, 70px below
      const geometry = await user.content.pathGeometry();
      const neighbour = geometry.at(-1);

      // Pan the view, then erase across the target only.
      await tb.selectTool('gtPan');
      await tb.drawStroke({ x: 900, y: 700 }, { x: 800, y: 650 }, 8);
      const targetBox = await tb.paths.nth(-2).boundingBox();
      const canvas = await tb.wbSvg.boundingBox();
      const y = targetBox.y - canvas.y + targetBox.height / 2;
      await tb.eraseDrag(
        { x: targetBox.x - canvas.x - 15, y },
        { x: targetBox.x - canvas.x + targetBox.width + 15, y },
        20
      );

      const after = await user.content.pathGeometry();
      expect(after, 'the neighbour survived').toContain(neighbour);
      expect(after.length, 'the target was erased').toBeLessThan(geometry.length);
    }
  );

  test(
    'WB-07-03: erasing over an empty area does nothing and does not error',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const tb = user.toolbar;
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await tb.penStroke({ x: 400, y: 300 }, { x: 600, y: 340 }); // something on the board, elsewhere
      const geometry = await user.content.pathGeometry();

      await tb.eraseDrag({ x: 1000, y: 700 }, { x: 1300, y: 800 }, 20); // nothing under this path

      expect(await user.content.pathGeometry(), 'nothing changed').toEqual(geometry);
      await expect(tb.container).toBeVisible();
      expect(errors, 'no uncaught page errors').toEqual([]);
    }
  );
});
