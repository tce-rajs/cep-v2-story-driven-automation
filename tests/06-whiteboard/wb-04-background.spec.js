// WB-04 — Background
// Source: CEPV2_Stories/06_Whiteboard.md
// (The control itself, incl. rapid toggling, is TB-03; this checks the effect from the content side.)

const { test, expect } = require('../../fixtures');

test.describe('WB-04 Background', () => {
  // Draw below the teacher's writing (never on top of it, never clearing it) and compare only this test's content.
  test.use({ freshSpace: true });

  test(
    'WB-04-01: changing the whiteboard background does not affect existing content',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      // Existing content of every kind: a stroke, a text box and a shape.
      await user.content.addLines(`bg-${Date.now()}`);
      await user.content.addShape();
      const before = await user.content.snapshot();
      const geometry = await user.content.pathGeometry();

      await user.toolbar.chooseBackground('gtGraphCms');
      await user.toolbar.chooseBackground('gtGreenBg');

      expect(await user.content.snapshot(), 'same paths, images and text').toEqual(before);
      expect(await user.content.pathGeometry(), 'same geometry').toEqual(geometry);

      await user.toolbar.chooseBackground('gtBlankPage');
    }
  );

  test(
    'WB-04-02: a background change never changes the colour of existing strokes',
    { tag: ['@negative'] },
    async ({ user }) => {
      const tb = user.toolbar;
      // A default-ink stroke and two picked colours, one stroke each; each found by its index (see WB-05-02).
      const at = [];
      for (let i = 0; i < 3; i++) {
        await tb.openToolPanel('gtPen');
        await tb.penColorOptions.nth(i).click({ force: true });
        await tb.closePanelByTappingOutside();
        await tb.drawStroke({ x: 400 + i * 120, y: 400 }, { x: 400 + i * 120, y: 520 }, 8);
        at.push((await tb.pathCount()) - 1);
      }
      const colours = () => tb.paths.evaluateAll((els, idx) => idx.map((i) => getComputedStyle(els[i]).stroke), at);
      const before = await colours();
      try {
        for (const bg of ['gtGraphCms', 'gtBlankPage']) {
          await tb.chooseBackground(bg);
          expect(await colours(), `stroke colours unchanged on ${bg}`).toEqual(before);
        }
      } finally {
        await tb.chooseBackground('gtBlankPage');
      }
    }
  );
});
