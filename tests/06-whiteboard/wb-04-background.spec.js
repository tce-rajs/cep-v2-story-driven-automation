// WB-04 — Background
// Source: CEPV2_Stories/06_Whiteboard.md
// (The control itself, incl. rapid toggling, is TB-03; this checks the effect from the content side.)

const { test, expect } = require('../../fixtures');

test.describe('WB-04 Background', () => {
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
});
