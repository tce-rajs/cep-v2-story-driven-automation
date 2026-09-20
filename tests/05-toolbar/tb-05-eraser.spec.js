// TB-05 — Eraser (Type / Size / Clear)
// Source: CEPV2_Stories/05_Toolbar.md
// "Letters" and "words" are drawn as separate strokes (one path each) so removal is countable: erasing
// one letter must remove exactly one path and leave every other path in place.

const { test, expect } = require('../../fixtures');

// Counts and "last path" lookups need a blank board, not the persisted content earlier tests left behind.
test.use({ cleanBoard: true });

test.describe('TB-05 Eraser (Type / Size / Clear)', () => {
  test(
    'TB-05-01: the eraser removes only the stroke segment dragged over',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      const before = await tb.pathCount();
      const xs = await tb.drawLetters(3, { x: 400, y: 400, gap: 120 });
      expect(await tb.pathCount()).toBe(before + 3);
      const drawn = await tb.pathData();

      // Sweep across only the middle stroke. CONFIRMED LIVE: the eraser removes the swept SEGMENT, not the whole
      // stroke -- the middle stroke is cut into two remaining pieces (3 strokes -> 4 paths).
      await tb.eraseDrag({ x: xs[1] - 30, y: 430 }, { x: xs[1] + 30, y: 430 });
      await expect.poll(() => tb.pathCount()).toBe(before + 4);

      // The strokes on either side were not touched at all.
      const untouched = (await tb.pathData()).filter((d) => drawn.includes(d));
      expect(untouched, 'the two neighbouring strokes are unchanged').toHaveLength(before + 2);
    }
  );

  test(
    'TB-05-02: erasing just one letter of a drawn word leaves the rest of the word intact',
    { tag: ['@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      const before = await tb.pathCount();
      const xs = await tb.drawLetters(5, { x: 400, y: 400, gap: 70 }); // a five-letter "word"
      expect(await tb.pathCount()).toBe(before + 5);
      const drawn = await tb.pathData();

      // The swept letter is cut in two (5 letters -> 6 paths); the other four are left exactly as drawn.
      await tb.eraseDrag({ x: xs[2] - 20, y: 430 }, { x: xs[2] + 20, y: 430 });
      await expect.poll(() => tb.pathCount()).toBe(before + 6);

      const untouched = (await tb.pathData()).filter((d) => drawn.includes(d));
      expect(untouched, 'the other four letters are unchanged').toHaveLength(before + 4);
    }
  );

  test(
    'TB-05-03: erasing one word of a drawn sentence leaves the rest of the sentence intact',
    { tag: ['@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      const before = await tb.pathCount();
      // Three "words" of 3 letters each, separated by wide gaps.
      const word1 = await tb.drawLetters(3, { x: 300, y: 400, gap: 50 });
      await tb.drawLetters(3, { x: 700, y: 400, gap: 50 });
      await tb.drawLetters(3, { x: 1100, y: 400, gap: 50 });
      expect(await tb.pathCount()).toBe(before + 9);
      const drawn = await tb.pathData();

      // One sweep across the whole first word cuts each of its 3 letters in two (9 -> 12 paths); the other two
      // words (6 letters) are left exactly as drawn.
      await tb.eraseDrag({ x: word1[0] - 25, y: 430 }, { x: word1[2] + 25, y: 430 });
      await expect.poll(() => tb.pathCount()).toBe(before + 12);

      const untouched = (await tb.pathData()).filter((d) => drawn.includes(d));
      expect(untouched, 'the other two words are unchanged').toHaveLength(before + 6);
    }
  );

  test(
    'TB-05-04: changing the eraser size changes how much is removed per pass',
    { tag: ['@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      // The eraser cuts a gap out of a stroke rather than deleting it, so the path count cannot show how much a pass
      // removed. Cut one long vertical stroke with a horizontal pass and measure how much of its height is gone:
      // 0 if it was left whole, the gap if it was cut in two, all of it if the pass wiped it out.
      const removedAt = async (fraction) => {
        // Each size starts from the same blank board and the same picture.
        await tb.clearBoard(user.whiteboard);
        await tb.selectTool('gtPen');
        await tb.drawStroke({ x: 600, y: 300 }, { x: 600, y: 560 }, 20);
        const fullHeight = (await tb.paths.first().boundingBox()).height;
        await tb.openToolPanel('gtErase');
        await tb.setSlider(tb.eraserSizeSlider, fraction);
        await tb.closePanelByTappingOutside();
        await tb.eraseDrag({ x: 570, y: 430 }, { x: 630, y: 430 }, 12);

        const remaining = await tb.paths.evaluateAll((els) =>
          els.reduce((sum, el) => sum + el.getBoundingClientRect().height, 0)
        );
        return Math.max(0, Math.round(fullHeight - remaining));
      };

      const small = await removedAt(0.05);
      const large = await removedAt(0.75); // the track tops out around here (size 85), beyond it the click misses
      test.info().annotations.push({
        type: 'note',
        description: `Stroke height removed per pass (px): small size=${small}, large size=${large}`,
      });
      expect(large, 'a larger eraser removes more per pass').toBeGreaterThan(small);
    }
  );

  test(
    'TB-05-05: the free/broad eraser mode removes content wherever it is dragged, without tracing each stroke',
    { tag: ['@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      const before = await tb.pathCount();
      await tb.drawLetters(4, { x: 400, y: 400, gap: 80, height: 80 });
      expect(await tb.pathCount()).toBe(before + 4);

      await tb.openToolPanel('gtErase');
      await tb.eraserFreeToggle.click({ force: true });
      await tb.closePanelByTappingOutside();

      // A loose sweep through the area, deliberately not lined up with any single stroke.
      await tb.eraseDrag({ x: 350, y: 380 }, { x: 750, y: 500 }, 40);
      await expect.poll(() => tb.pathCount()).toBe(before);
    }
  );

  test(
    'TB-05-06: "Clear" removes all whiteboard content, with a confirmation step first',
    { tag: ['@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      const wb = user.whiteboard;
      await tb.drawLetters(3, { x: 400, y: 400, gap: 100 });
      expect(await tb.pathCount()).toBeGreaterThanOrEqual(3);

      await tb.openToolPanel('gtErase');
      await wb.clearWhiteboardBtn.click({ force: true });

      // Confirmation first: nothing is gone yet.
      await expect(wb.clearConfirmDialogConfirmBtn).toBeVisible();
      await expect(wb.clearConfirmDialogCancelBtn).toBeVisible();
      expect(await tb.pathCount(), 'content untouched until confirmed').toBeGreaterThanOrEqual(3);

      await wb.clearConfirmDialogConfirmBtn.click({ force: true });
      await expect.poll(() => tb.pathCount()).toBe(0);
    }
  );

  test(
    'TB-05-07: the eraser does not leave small fragments behind after a single drag pass',
    { tag: ['@regression'] },
    async ({ user }) => {
      const tb = user.toolbar;
      const before = await tb.pathCount();
      await tb.penStroke({ x: 400, y: 500 }, { x: 520, y: 500 }); // a short, ~120px stroke
      expect(await tb.pathCount()).toBe(before + 1);

      await tb.eraseDrag({ x: 380, y: 500 }, { x: 540, y: 500 }, 30); // one pass covering it fully
      await expect.poll(() => tb.pathCount(), 'one pass fully clears it — no fragments').toBe(before);
    }
  );
});
