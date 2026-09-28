// WB-03 — Pan
// Source: CEPV2_Stories/06_Whiteboard.md
// (The Pan tool as a toolbar control is TB-02; this story checks the effect on the whiteboard content.)

const { test, expect } = require('../../fixtures');

// Counts and "last path" lookups need a blank board, not the persisted content earlier tests left behind.
test.use({ cleanBoard: true });

test.describe('WB-03 Pan', () => {
  test(
    'WB-03-01: panning the canvas moves the view without affecting content placement',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      await tb.penStroke({ x: 400, y: 400 }, { x: 520, y: 440 });
      await tb.penStroke({ x: 700, y: 500 }, { x: 820, y: 560 });
      const geometry = await user.content.pathGeometry();
      const first = (await tb.paths.nth(-2).boundingBox()) || (await tb.lastPathBox());
      const second = await tb.lastPathBox();

      await tb.selectTool('gtPan');
      await tb.drawStroke({ x: 900, y: 600 }, { x: 600, y: 500 }, 12);

      const firstAfter = await tb.paths.nth(-2).boundingBox();
      const secondAfter = await tb.lastPathBox();
      expect(firstAfter.x !== first.x || firstAfter.y !== first.y, 'the view actually moved').toBe(true);
      // Both objects moved together: the distance between them (their relative placement) is unchanged.
      expect(secondAfter.x - firstAfter.x).toBeCloseTo(second.x - first.x, 0);
      expect(secondAfter.y - firstAfter.y).toBeCloseTo(second.y - first.y, 0);
      expect(await user.content.pathGeometry(), 'content itself unchanged').toEqual(geometry);
    }
  );

  test(
    'WB-03-02: panning to the extreme edge does not clip or lose content near the boundary',
    { tag: ['@edge'] },
    async ({ user }) => {
      const tb = user.toolbar;
      const canvas = await tb.wbSvg.boundingBox();
      // Content hard against the right-hand boundary of the visible canvas.
      const edgeX = Math.floor(canvas.width - 260);
      await tb.penStroke({ x: edgeX, y: 500 }, { x: edgeX + 150, y: 560 });
      const geometry = await user.content.pathGeometry();
      const count = await tb.pathCount();

      await tb.selectTool('gtPan');
      for (let i = 0; i < 6; i++) await tb.drawStroke({ x: 1300, y: 600 }, { x: 200, y: 600 }, 10); // hard left
      for (let i = 0; i < 6; i++) await tb.drawStroke({ x: 200, y: 600 }, { x: 1300, y: 600 }, 10); // and back

      expect(await tb.pathCount(), 'nothing near the boundary was lost').toBe(count);
      expect(await user.content.pathGeometry(), 'and nothing was clipped or altered').toEqual(geometry);
    }
  );

  // --- Added 2026-09-26 (Zoho TCN-I16253, TCN-I15241). Data: 'playersDefault' holds a Worksheet to open. ---

  test(
    "WB-03-03: opening an asset from the Playlist doesn't pan the whiteboard by itself (regression, Zoho TCN-I16253)",
    { tag: ['@regression'] },
    async ({ user }) => {
      await user.nav.applyClassMap('playersDefault');
      await user.playlist.ensureDrawerVisible();
      const tb = user.toolbar;
      await tb.penStroke({ x: 500, y: 420 }, { x: 650, y: 440 });
      // Measure only once the board has stopped moving after the class switch (live 2026-09-26: one run of eight saw a
      // 15px shift that did not reproduce in 7 reruns -- the board was still settling when the "before" box was taken).
      await tb.waitForBoardToSettle();
      const key = (b) => `${Math.round(b.x)},${Math.round(b.y)}`;
      let before = await tb.lastPathBox();
      await expect
        .poll(
          async () => {
            const now = await tb.lastPathBox();
            const same = key(now) === key(before);
            before = now;
            return same;
          },
          { message: 'board settled', intervals: [700] }
        )
        .toBe(true);
      await user.player.openResourceCard(user.player.worksheetCards);
      expect(await user.player.isPlayerOpen(), 'asset opened').toBe(true);
      await user.page.waitForTimeout(2000);
      await user.player.closePlayer();
      const after = await tb.lastPathBox();
      expect(Math.abs(after.x - before.x) + Math.abs(after.y - before.y), 'the board did not move').toBeLessThan(3);
    }
  );

  test(
    'WB-03-04: an asset opened from the Playlist appears where the teacher is working, not at the top of the board (regression, Zoho TCN-I15241)',
    { tag: ['@regression'] },
    async ({ user }) => {
      await user.nav.applyClassMap('playersDefault');
      await user.playlist.ensureDrawerVisible();
      const tb = user.toolbar;
      // Work further down the board: pan so the view is well away from the board's top.
      await tb.selectTool('gtPan');
      await tb.drawStroke({ x: 700, y: 700 }, { x: 700, y: 200 }, 12);
      await user.player.openResourceCard(user.player.worksheetCards);
      expect(await user.player.isPlayerOpen(), 'asset opened').toBe(true);
      const closeIcon = user.player.closeIcon.first();
      await expect(closeIcon, 'the asset is in the visible area, where the teacher is').toBeInViewport();
      const viewport = await user.header.viewportSize();
      const box = await closeIcon.boundingBox();
      expect(box.y, 'not pushed off the top').toBeGreaterThanOrEqual(0);
      expect(box.y, 'within the window').toBeLessThan(viewport.height);
      await user.player.closePlayer();
    }
  );
});
