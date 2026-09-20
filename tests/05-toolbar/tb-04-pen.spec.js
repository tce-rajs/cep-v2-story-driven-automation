// TB-04 — Pen (Draw / Size / Color)
// Source: CEPV2_Stories/05_Toolbar.md

const { test, expect } = require('../../fixtures');

// Counts and "last path" lookups need a blank board, not the persisted content earlier tests left behind.
test.use({ cleanBoard: true });

const THICKNESS_LABELS = ['Thin', 'Normal', 'Thick', 'Strong'];

test.describe('TB-04 Pen (Draw / Size / Color)', () => {
  test(
    'TB-04-01: selecting the pencil and dragging across the canvas draws a stroke following the drag path',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      const canvas = await tb.wbSvg.boundingBox();
      const from = { x: 400, y: 400 };
      const to = { x: 700, y: 520 };
      const before = await tb.pathCount();

      await tb.penStroke(from, to);

      expect(await tb.pathCount()).toBe(before + 1);
      const box = await tb.lastPathBox();
      // The stroke's extent matches the drag: starts near `from`, ends near `to`.
      const tolerance = 25;
      expect(Math.abs(box.x - (canvas.x + from.x))).toBeLessThan(tolerance);
      expect(Math.abs(box.y - (canvas.y + from.y))).toBeLessThan(tolerance);
      expect(Math.abs(box.x + box.width - (canvas.x + to.x))).toBeLessThan(tolerance);
      expect(Math.abs(box.y + box.height - (canvas.y + to.y))).toBeLessThan(tolerance);
    }
  );

  test(
    'TB-04-02: drawing with each available pen colour renders that colour correctly',
    { tag: ['@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      await tb.openToolPanel('gtPen');
      const colours = await tb.penColorOptions.count();
      expect(colours, 'more than one pen colour offered').toBeGreaterThan(1);
      await tb.closePanelByTappingOutside();

      const rendered = [];
      const swatches = [];
      for (let i = 0; i < colours; i++) {
        await tb.openToolPanel('gtPen');
        const option = tb.penColorOptions.nth(i);
        const swatch = await option.evaluate((el) => getComputedStyle(el).backgroundColor);
        swatches.push(swatch);
        await option.click({ force: true });
        await tb.closePanelByTappingOutside();

        const before = await tb.pathCount();
        await tb.drawStroke({ x: 300 + i * 40, y: 300 }, { x: 300 + i * 40, y: 420 }, 8);
        expect(await tb.pathCount(), `colour ${i + 1} drew a stroke`).toBe(before + 1);

        const { color } = await tb.strokeOf(tb.paths.last());
        rendered.push(color);
        if (swatch !== 'rgba(0, 0, 0, 0)') {
          expect(color, `stroke colour matches swatch ${i + 1}`).toBe(swatch);
        }
      }
      // CONFIRMED LIVE: the palette lists white twice ("default" and "white-19" are both rgb(255, 255, 255)), so 25
      // options are only 24 distinct colours. Every DISTINCT swatch must render as its own distinct colour.
      const distinctSwatches = new Set(swatches).size;
      if (distinctSwatches < colours) {
        test.info().annotations.push({
          type: 'note',
          description: `${colours} pen colour options but only ${distinctSwatches} distinct swatches (duplicate white)`,
        });
      }
      expect(new Set(rendered).size, 'every distinct colour renders as a distinct colour').toBe(distinctSwatches);
    }
  );

  test(
    'TB-04-03: drawing with each available pen thickness renders that thickness correctly',
    { tag: ['@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      const widths = [];
      for (let i = 0; i < THICKNESS_LABELS.length; i++) {
        await tb.openToolPanel('gtPen');
        await tb.panel.getByText(THICKNESS_LABELS[i], { exact: true }).click({ force: true });
        await tb.closePanelByTappingOutside();

        const before = await tb.pathCount();
        await tb.drawStroke({ x: 300 + i * 50, y: 500 }, { x: 300 + i * 50, y: 620 }, 8);
        expect(await tb.pathCount(), `${THICKNESS_LABELS[i]} drew a stroke`).toBe(before + 1);
        widths.push((await tb.strokeOf(tb.paths.last())).width);
      }
      test.info().annotations.push({
        type: 'note',
        description: `Stroke widths (${THICKNESS_LABELS.join('/')}): ${widths.join(', ')}`,
      });
      for (let i = 1; i < widths.length; i++) {
        expect(widths[i], `${THICKNESS_LABELS[i]} is thicker than ${THICKNESS_LABELS[i - 1]}`).toBeGreaterThan(
          widths[i - 1]
        );
      }
    }
  );

  test(
    'TB-04-04: a 2000-character text object and emoji/RTL text render correctly in a text box',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const wb = user.whiteboard;
      const cases = {
        long: 'The quick brown fox jumps over the lazy dog. '.repeat(45).slice(0, 2000),
        emoji: 'Great work 😀👍🎉',
        rtl: 'مرحبا بالعالم שלום עולם',
      };
      let x = 300;
      for (const [name, text] of Object.entries(cases)) {
        const before = await wb.textObjects.count();
        const box = await wb.insertTextAndType(x, 300, text);
        await page.waitForTimeout(500);

        await expect(wb.textObjects, `${name}: a text object was created`).toHaveCount(before + 1);
        const rendered = (await box.textContent()) || '';
        expect(rendered, `${name}: full text present`).toContain(text.trim());
        if (name === 'long') expect(rendered.length).toBeGreaterThanOrEqual(2000);
        await user.toolbar.selectTool('gtSelect');
        x += 350;
      }
    }
  );
});
